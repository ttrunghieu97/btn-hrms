import { Injectable } from "@nestjs/common";
import { LeaveRequestsRepository } from "@/modules/leave/leave-management/repositories/leave-requests.repository";
import { LeaveLifecycleService } from "@/modules/leave/leave-management/services/leave-lifecycle.service";
import { LeaveAttendanceReconciliationService } from "@/modules/leave/leave-management/services/leave-attendance-reconciliation.service";
import { EventOutboxService } from "@/core/events/event-outbox.service";
import { LeaveApprovedEvent } from "@/core/events/events/leave-approved.event";
import { LeaveRejectedEvent } from "@/core/events/events/leave-rejected.event";
import { LeaveApprovalLinkRepository } from "./leave-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

@Injectable()
export class LeaveDecisionHandler {
  private readonly logger: ContextLogger;

  constructor(
    private readonly leaveRepo: LeaveRequestsRepository,
    private readonly lifecycle: LeaveLifecycleService,
    private readonly reconciliation: LeaveAttendanceReconciliationService,
    private readonly eventOutbox: EventOutboxService,
    private readonly linkRepo: LeaveApprovalLinkRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, LeaveDecisionHandler.name);
  }

  async handleApproval(params: {
    leaveRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
  }): Promise<{ applied: boolean; finalStatus: string } | undefined> {
    const { leaveRequestId, decidedByUserId, decidedAt } = params;

    // Guard 1: correlation must exist (reject orphan events)
    const link = await this.linkRepo.findByLeaveRequestId(leaveRequestId);
    if (!link) {
      this.logger.warn(
        `No approval link for leave ${leaveRequestId} — ignoring approval`,
      );
      return undefined;
    }

    const txResult = await this.leaveRepo.transaction(async (tx) => {
      const existing = await this.leaveRepo.findById(leaveRequestId, tx);
      if (!existing) {
        this.logger.warn(`Leave ${leaveRequestId} not found for approval`);
        return undefined;
      }

      // Guard 2: terminal state → reject late engine decision
      if (this.lifecycle.isTerminalState(existing.status)) {
        this.logger.warn(
          `Leave ${leaveRequestId} is in terminal state ${existing.status} — ignoring late approval`,
        );
        return { applied: false, finalStatus: existing.status };
      }

      this.lifecycle.assertTransition(existing.status, "approved", leaveRequestId);

      const updatedRecord = await this.leaveRepo.updateStatusWithGuard(
        leaveRequestId,
        existing.status,
        {
          status: "approved",
          approverUserId: decidedByUserId,
          approvedAt: decidedAt,
        },
        tx,
      );
      if (!updatedRecord) {
        this.logger.warn(
          `Leave ${leaveRequestId} was modified concurrently — skipping approval`,
        );
        return { applied: false, finalStatus: "approved" };
      }

      // Consume balance (for paid leave types)
      const isPaid = existing.leaveType?.isPaid ?? true;
      if (isPaid) {
        const balanceYear = new Date(existing.startDate).getFullYear();
        const balance = this.leaveRepo.lockBalanceForYear
          ? await this.leaveRepo.lockBalanceForYear(
              existing.employeeId,
              existing.leaveTypeId,
              balanceYear,
              tx,
            )
          : await this.leaveRepo.findBalanceForYear(
              existing.employeeId,
              existing.leaveTypeId,
              balanceYear,
              tx,
            );
        if (balance) {
          const updated = await this.leaveRepo.incrementUsedBalance(
            balance.id,
            existing.totalUnits.toString(),
            tx,
          );
          if (!updated) {
            const insufficientReason =
              "Insufficient leave balance to complete approval";
            this.logger.warn(
              `Leave request ${leaveRequestId} auto-rejected during approval: ${insufficientReason}`,
            );

            await this.leaveRepo.updateStatusWithGuard(
              leaveRequestId,
              "approved",
              {
                status: "rejected",
                approverUserId: decidedByUserId,
                approvedAt: null,
                rejectedAt: decidedAt,
                rejectionReason: insufficientReason,
              },
              tx,
            );

            if (this.linkRepo.updateStatus) {
              await this.linkRepo.updateStatus(leaveRequestId, "rejected", tx);
            }

            await this.leaveRepo.createAuditLog(
              decidedByUserId,
              "leave_request_reject_insufficient_balance",
              leaveRequestId,
              {
                previousStatus: existing.status,
                newStatus: "rejected",
                reason: insufficientReason,
              },
              tx,
            );

            await this.eventOutbox.stage(
              new LeaveRejectedEvent({
                idempotencyKey: `${leaveRequestId}:leave.rejected`,
                leaveRequestId,
                employeeId: existing.employeeId,
                rejectedByUserId: decidedByUserId,
                rejectedAt: decidedAt.toISOString(),
                reason: insufficientReason,
              }),
              tx,
            );

            return { applied: true, finalStatus: "rejected" as const };
          }
        }
      }

      if (this.linkRepo.updateStatus) {
        await this.linkRepo.updateStatus(leaveRequestId, "approved", tx);
      }

      await this.leaveRepo.createAuditLog(
        decidedByUserId,
        "leave_request_approve",
        leaveRequestId,
        { previousStatus: existing.status, newStatus: "approved" },
        tx,
      );

      // SINGLE source of truth for LeaveApprovedEvent
      await this.eventOutbox.stage(
        new LeaveApprovedEvent({
          idempotencyKey: `${leaveRequestId}:leave.approved`,
          leaveRequestId,
          employeeId: existing.employeeId,
          approvedByUserId: decidedByUserId,
          approvedAt: decidedAt.toISOString(),
          autoApproved: decidedByUserId === null,
        }),
        tx,
      );

      return { applied: true, finalStatus: "approved" as const };
    });

    // Reconcile attendance OUTSIDE transaction only when approval succeeded
    if (txResult?.applied && txResult.finalStatus === "approved") {
      const updated = await this.leaveRepo.findById(leaveRequestId);
      if (updated) {
        try {
          await this.reconciliation.reconcileApprovedLeave(updated);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Leave ${leaveRequestId} reconcile failed: ${msg}`);
        }
      }
    }

    return txResult;
  }

  async handleRejection(params: {
    leaveRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
    rejectionReason?: string | null;
  }): Promise<{ applied: boolean; finalStatus: string } | undefined> {
    const { leaveRequestId, decidedByUserId, decidedAt, rejectionReason } = params;

    // Guard 1: correlation must exist
    const link = await this.linkRepo.findByLeaveRequestId(leaveRequestId);
    if (!link) {
      this.logger.warn(
        `No approval link for leave ${leaveRequestId} — ignoring rejection`,
      );
      return undefined;
    }

    return this.leaveRepo.transaction(async (tx) => {
      const existing = await this.leaveRepo.findById(leaveRequestId, tx);
      if (!existing) {
        this.logger.warn(`Leave ${leaveRequestId} not found for rejection`);
        return undefined;
      }

      // Guard 2: terminal state → reject late engine decision
      if (this.lifecycle.isTerminalState(existing.status)) {
        this.logger.warn(
          `Leave ${leaveRequestId} is in terminal state ${existing.status} — ignoring late rejection`,
        );
        return { applied: false, finalStatus: existing.status };
      }

      this.lifecycle.assertTransition(existing.status, "rejected", leaveRequestId);

      const updatedRecord = await this.leaveRepo.updateStatusWithGuard(
        leaveRequestId,
        existing.status,
        {
          status: "rejected",
          approverUserId: decidedByUserId,
          rejectedAt: decidedAt,
          rejectionReason: rejectionReason ?? null,
        },
        tx,
      );
      if (!updatedRecord) {
        this.logger.warn(
          `Leave ${leaveRequestId} was modified concurrently — skipping rejection`,
        );
        return { applied: false, finalStatus: "rejected" };
      }

      if (this.linkRepo.updateStatus) {
        await this.linkRepo.updateStatus(leaveRequestId, "rejected", tx);
      }

      await this.leaveRepo.createAuditLog(
        decidedByUserId,
        "leave_request_reject",
        leaveRequestId,
        { previousStatus: existing.status, newStatus: "rejected", reason: rejectionReason },
        tx,
      );

      // SINGLE source of truth for LeaveRejectedEvent
      await this.eventOutbox.stage(
        new LeaveRejectedEvent({
          idempotencyKey: `${leaveRequestId}:leave.rejected`,
          leaveRequestId,
          employeeId: existing.employeeId,
          rejectedByUserId: decidedByUserId,
          rejectedAt: decidedAt.toISOString(),
          reason: rejectionReason ?? null,
        }),
        tx,
      );

      return { applied: true, finalStatus: "rejected" as const };
    });
  }
}
