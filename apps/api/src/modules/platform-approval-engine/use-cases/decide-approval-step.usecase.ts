import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ApprovalRequestDecidedEvent } from "../../../core/events/events/approval-request-decided.event";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";
import { throwNotFound, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { DecideApprovalStepDto } from "../dto/decide-approval-step.dto";

@Injectable()
export class DecideApprovalStepUseCase {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(dto: DecideApprovalStepDto, userId: string) {
    return this.repo.transaction(async (tx) => {
      const req = await this.repo.findRequestById(dto.requestId);
      if (!req) throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { requestId: dto.requestId });
      if (req.status !== "pending") {
        throwBadRequest("Approval request is not pending", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, { requestId: dto.requestId, status: req.status });
      }

      const step = await this.repo.findStep(dto.requestId, dto.stepIndex);
      if (!step) throwNotFound("Approval step not found", ERROR_CODES.APPROVAL_STEP_NOT_FOUND, { requestId: dto.requestId, stepIndex: dto.stepIndex });
      if (step.status !== "pending") {
        throwBadRequest("Approval step already decided", ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED, { stepId: step.id, status: step.status });
      }
      if (step.approverUserId && step.approverUserId !== userId) {
        throwBadRequest("Approval step is assigned to another approver", ERROR_CODES.INVALID_REQUEST, { stepId: step.id });
      }

      const nextStatus = dto.decision === "approve" ? "approved" : "rejected";
      await this.repo.updateStep(step.id, {
        status: nextStatus,
        decidedByUserId: userId,
        decidedAt: new Date(),
        comment: dto.comment ?? null,
      });

      if (dto.decision === "reject") {
        await this.repo.updateRequest(req.id, {
          status: "rejected",
          decidedAt: new Date(),
        });

        const decidedEvent = new ApprovalRequestDecidedEvent({
          idempotencyKey: `${req.id}:approval.request.decided`,
          approvalRequestId: req.id,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          decision: "rejected",
          decidedByUserId: userId,
          decidedAt: new Date().toISOString(),
        });
        await this.eventOutbox.stage(decidedEvent, tx);

        const completedEvent = new ApprovalRequestCompletedEvent({
          idempotencyKey: `${req.id}:approval.request.completed`,
          approvalRequestId: req.id,
          policyKey: "",
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "rejected",
          completedAt: new Date().toISOString(),
        });
        await this.eventOutbox.stage(completedEvent, tx);

        return { status: "rejected" as const };
      }

      const hasPending = await this.repo.anyPendingStep(req.id);
      if (!hasPending) {
        await this.repo.updateRequest(req.id, {
          status: "approved",
          decidedAt: new Date(),
        });

        const decidedEvent = new ApprovalRequestDecidedEvent({
          idempotencyKey: `${req.id}:approval.request.decided`,
          approvalRequestId: req.id,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          decision: "approved",
          decidedByUserId: userId,
          decidedAt: new Date().toISOString(),
        });
        await this.eventOutbox.stage(decidedEvent, tx);

        const completedEvent = new ApprovalRequestCompletedEvent({
          idempotencyKey: `${req.id}:approval.request.completed`,
          approvalRequestId: req.id,
          policyKey: "",
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "approved",
          completedAt: new Date().toISOString(),
        });
        await this.eventOutbox.stage(completedEvent, tx);

        return { status: "approved" as const };
      }

      await this.repo.updateRequest(req.id, {
        currentStepIndex: dto.stepIndex + 1,
        updatedAt: new Date(),
      });

      const decidedEvent = new ApprovalRequestDecidedEvent({
        idempotencyKey: `${req.id}:approval.request.decided`,
        approvalRequestId: req.id,
        subjectType: req.subjectType,
        subjectId: req.subjectId,
        decision: "approved",
        decidedByUserId: userId,
        decidedAt: new Date().toISOString(),
      });
      await this.eventOutbox.stage(decidedEvent, tx);

      return { status: "pending" as const };
    });
  }
}
