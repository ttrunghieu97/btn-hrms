import { Injectable } from "@nestjs/common";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { LeaveLifecycleService } from "../services/leave-lifecycle.service";
import { LeaveAttendanceReconciliationService } from "../services/leave-attendance-reconciliation.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

@Injectable()
export class CancelLeaveRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly lifecycleService: LeaveLifecycleService,
    private readonly reconciliationService: LeaveAttendanceReconciliationService,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CancelLeaveRequestUseCase.name);
  }

  async execute(id: string, actor: AuthUser) {
    const existing = await this.leaveRequestsRepo.findById(id);
    if (!existing) {
      throwNotFound("Leave request not found", ERROR_CODES.INVALID_REQUEST, {
        leaveRequestId: id,
      });
    }

    const canCancel =
      existing.employeeId === actor.employeeId ||
      actor.isSuperAdmin === true ||
      actor.permissions.includes(Permissions.SYS_ALL) ||
      actor.permissions.includes(Permissions.LEAVE_APPROVE) ||
      actor.permissions.includes(Permissions.LEAVE_APPROVE_DEPARTMENT);

    if (!canCancel) {
      throwForbidden(
        "Cannot cancel another employee's leave request",
        ERROR_CODES.FORBIDDEN,
        { leaveRequestId: id },
      );
    }

    this.lifecycleService.assertTransition(
      existing.status ,
      "cancelled",
      id,
    );

    const wasApproved = existing.status === "approved";

    const updated = await this.leaveRequestsRepo.transaction(async (tx) => {
      const record = await this.leaveRequestsRepo.update(
        id,
        {
          status: "cancelled",
          cancelledAt: new Date(),
        } ,
        tx,
      );
      if (!record) {
        throwNotFound("Leave request not found", ERROR_CODES.INVALID_REQUEST, {
          leaveRequestId: id,
        });
      }

      // 1. Emit cancellation event if pending (engine sync needed)
      if (existing.status === "pending") {
        await this.eventOutbox.stage(
          {
            eventType: "leave.cancellation.requested",
            eventVersion: 1,
            payload: {
              idempotencyKey: `${id}:leave.cancellation.requested`,
              leaveRequestId: id,
              cancelledByUserId: actor.id,
            },
          },
          tx,
        );
      }

      // 2. Restore Balance if previously approved
      if (wasApproved) {
        const balanceYear = new Date(existing.startDate).getFullYear();
        const balance = await this.leaveRequestsRepo.findBalanceForYear(
          existing.employeeId,
          existing.leaveTypeId,
          balanceYear,
        );
        if (balance) {
          await this.leaveRequestsRepo.decrementUsedBalance(
            balance.id,
            existing.totalUnits.toString(),
            tx,
          );
        }
      }

      // 2. Audit
      await this.leaveRequestsRepo.createAuditLog(
        actor.id,
        "leave_request_cancel",
        id,
        {
          previousStatus: existing.status,
          newStatus: "cancelled",
        },
        tx,
      );

      await this.eventOutbox.stage(
        {
          eventType: "leave.request.cancelled",
          aggregateId: id,
          actorUserId: actor.id,
          payload: { leaveRequestId: id, employeeId: existing.employeeId },
        },
        tx,
      );

      return record;
    });

    // 3. Reconciliation (outside tx — may need its own db operations)
    if (wasApproved) {
      try {
        await this.reconciliationService.reconcileCanceledLeave(updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Leave cancel reconcile failed for ${id}: ${message}`);
        throw error;
      }
    }

    return LeaveRequestMapper.toResponseDto(
      await this.leaveRequestsRepo.findById(id),
    );
  }
}






