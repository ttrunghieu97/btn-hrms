import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";
import { throwNotFound, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class CancelApprovalUseCase {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(approvalRequestId: string): Promise<void> {
    const req = await this.repo.findRequestById(approvalRequestId);
    if (!req) throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { approvalRequestId });
    if (req.status !== "pending") {
      throwBadRequest("Cannot cancel a non-pending approval request", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, { approvalRequestId, status: req.status });
    }

    await this.repo.transaction(async (tx) => {
      await this.repo.skipPendingSteps(approvalRequestId, tx);

      await this.repo.updateRequest(approvalRequestId, {
        status: "cancelled",
        decidedAt: new Date(),
      }, tx);

      await this.eventOutbox.stage(
        new ApprovalRequestCompletedEvent({
          idempotencyKey: `${approvalRequestId}:approval.request.completed`,
          approvalRequestId,
          policyKey: "",
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "cancelled",
          completedAt: new Date().toISOString(),
        }),
        tx,
      );
    });
  }
}
