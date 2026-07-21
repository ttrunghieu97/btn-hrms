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
  }) {
    const { leaveRequestId, decidedByUserId, decidedAt } = params;

    // Guard 1: correlation must exist (reject orphan events)
    const link = await this.linkRepo.findByLeaveRequestId(leaveRequestId);
    if (!link) {
      this.logger.warn(
        `No approval link for leave ${leaveRequestId} — ignoring approval`,
      );
      return;
    }

    await this.leaveRepo.transaction(async (tx) => {
      const existing = await this.leaveRepo.findById(leaveRequestId);
      if (!existing) {
        this.logger.warn(`Leave ${leaveRequestId} not found for approval`);
        return;
      }

      // Guard 2: terminal state → reject late engine decision
      if (this.lifecycle.isTerminalState(existing.status)) {
        this.logger.warn(
          `Leave ${leaveRequestId} is in terminal state ${existing.status} — ignoring late approval`,
        );
        return;
      }

      this.lifecycle.assertTransition(existing.status, "approved", leaveRequestId);

      await this.leaveRepo.update(
        leaveRequestId,
        {
          status: "approved",
          approverUserId: decidedByUserId,
          approvedAt: decidedAt,
        },
        tx,
      );

      // Consume balance
      const balanceYear = new Date(existing.startDate).getFullYear();
      const balance = await this.leaveRepo.findBalanceForYear(
        existing.employeeId,
        existing.leaveTypeId,
        balanceYear,
      );
      if (balance) {
        await this.leaveRepo.incrementUsedBalance(
          balance.id,
          existing.totalUnits.toString(),
          tx,
        );
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
    });

    // Reconcile attendance OUTSIDE transaction
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

  async handleRejection(params: {
    leaveRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
    rejectionReason?: string | null;
  }) {
    const { leaveRequestId, decidedByUserId, decidedAt, rejectionReason } = params;

    // Guard 1: correlation must exist
    const link = await this.linkRepo.findByLeaveRequestId(leaveRequestId);
    if (!link) {
      this.logger.warn(
        `No approval link for leave ${leaveRequestId} — ignoring rejection`,
      );
      return;
    }

    await this.leaveRepo.transaction(async (tx) => {
      const existing = await this.leaveRepo.findById(leaveRequestId);
      if (!existing) {
        this.logger.warn(`Leave ${leaveRequestId} not found for rejection`);
        return;
      }

      // Guard 2: terminal state → reject late engine decision
      if (this.lifecycle.isTerminalState(existing.status)) {
        this.logger.warn(
          `Leave ${leaveRequestId} is in terminal state ${existing.status} — ignoring late rejection`,
        );
        return;
      }

      this.lifecycle.assertTransition(existing.status, "rejected", leaveRequestId);

      await this.leaveRepo.update(
        leaveRequestId,
        {
          status: "rejected",
          approverUserId: decidedByUserId,
          rejectedAt: decidedAt,
          rejectionReason: rejectionReason ?? null,
        },
        tx,
      );

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
    });
  }
}
