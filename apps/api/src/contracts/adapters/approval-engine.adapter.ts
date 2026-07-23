import { Injectable } from "@nestjs/common";
import {
  ApprovalEnginePort,
  RequestApprovalInput,
  DecideStepInput,
  ApprovalRequestResult,
  PendingStep,
} from "../ports/approval-engine.port";
import { RequestApprovalUseCase } from "../../modules/platform-approval-engine/use-cases/request-approval.usecase";
import { DecideApprovalStepUseCase } from "../../modules/platform-approval-engine/use-cases/decide-approval-step.usecase";
import { CancelApprovalUseCase } from "../../modules/platform-approval-engine/use-cases/cancel-approval.usecase";
import { PlatformApprovalEngineRepository } from "../../modules/platform-approval-engine/repositories/platform-approval-engine.repository";

/**
 * Adapter between the approval engine port (consumed by integration modules)
 * and the approval engine use cases + repository.
 *
 * Each method delegates to the corresponding use case which handles
 * transactions, business invariants, and domain events.
 */
@Injectable()
export class ApprovalEngineAdapter implements ApprovalEnginePort {
  constructor(
    private readonly requestApprovalUseCase: RequestApprovalUseCase,
    private readonly decideStepUseCase: DecideApprovalStepUseCase,
    private readonly cancelApprovalUseCase: CancelApprovalUseCase,
    private readonly engineRepo: PlatformApprovalEngineRepository,
  ) {}

  async requestApproval(input: RequestApprovalInput): Promise<ApprovalRequestResult> {
    return this.requestApprovalUseCase.execute({
      policyId: input.policyId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      requestedByUserId: input.requestedByUserId ?? undefined,
      metadata: input.metadata,
    });
  }

  async cancelApproval(approvalRequestId: string): Promise<void> {
    return this.cancelApprovalUseCase.execute(approvalRequestId);
  }

  async decideStep(input: DecideStepInput): Promise<{ status: string }> {
    return this.decideStepUseCase.execute(
      {
        requestId: input.requestId,
        stepIndex: input.stepIndex,
        decision: input.decision,
        comment: input.comment ?? undefined,
      },
      input.decidedByUserId,
    );
  }

  async findPendingStepByApprover(requestId: string, userId: string): Promise<PendingStep | null> {
    const step = await this.engineRepo.findPendingStepByApprover(requestId, userId);
    return step as PendingStep | null;
  }

  async findActivePolicyByKey(key: string): Promise<{ id: string } | null> {
    const policy = await this.engineRepo.findActivePolicyByKey(key);
    return policy ?? null;
  }
}
