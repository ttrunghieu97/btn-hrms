import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ApprovalRequestCreatedEvent } from "../../../core/events/events/approval-request-created.event";
import { throwNotFound, throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { RequestApprovalDto } from "../dto/request-approval.dto";

@Injectable()
export class RequestApprovalUseCase {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(dto: RequestApprovalDto) {
    const policy = await this.repo.findPolicyById(dto.policyId);
    if (!policy) throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, { policyId: dto.policyId });

    return this.repo.transaction(async (tx) => {
      const existing = await this.repo.findRequestBySubject(dto.subjectType, dto.subjectId);
      if (existing) return existing;

      const request = await this.repo.insertRequest({
        policyId: dto.policyId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        requestedByUserId: dto.requestedByUserId ?? null,
        metadata: dto.metadata ?? null,
      });

      if (!request) throw new Error("Failed to create approval request");

      const steps = Array.isArray((policy.steps as any)?.steps)
        ? ((policy.steps as any).steps as any[])
        : null;
      if (!steps || steps.length === 0) {
        throwBadRequest("Approval policy has no steps", ERROR_CODES.APPROVAL_POLICY_EMPTY_STEPS, { policyId: dto.policyId });
      }

      await this.repo.insertSteps(
        steps.map((step: any, idx: number) => ({
          requestId: request.id,
          stepIndex: idx,
          status: "pending" as any,
          approverUserId: (step?.approverUserId as string) ?? null,
          payload: step ?? null,
        })),
      );

      await this.eventOutbox.stage(
        new ApprovalRequestCreatedEvent({
          idempotencyKey: `${request.id}:approval.request.created`,
          approvalRequestId: request.id,
          policyId: dto.policyId,
          policyKey: policy.key,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          requestedByUserId: dto.requestedByUserId ?? null,
          requestedAt: new Date().toISOString(),
        }),
        tx,
      );

      return request;
    });
  }
}
