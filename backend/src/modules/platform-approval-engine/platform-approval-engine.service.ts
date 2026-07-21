import { Injectable } from "@nestjs/common";
import { throwBadRequest, throwNotFound } from "../../shared/utils/http-error";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { PlatformApprovalEngineRepository } from "./repositories/platform-approval-engine.repository";

@Injectable()
export class PlatformApprovalEngineService {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async createPolicy(input: {
    key: string;
    version?: number;
    name?: string | null;
    description?: string | null;
    steps: Record<string, unknown>;
  }) {
    const row = await this.repo.insertPolicy({
      key: input.key,
      version: input.version ?? 1,
      name: input.name ?? null,
      description: input.description ?? null,
      steps: input.steps,
    });
    if (!row) throw new Error("Failed to create approval policy");
    return row;
  }

  async requestApproval(input: {
    policyId: string;
    subjectType: string;
    subjectId: string;
    requestedByUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const policy = await this.repo.findPolicyById(input.policyId);
    if (!policy) throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, { policyId: input.policyId });

    // Idempotent: reuse existing approval request for this subject
    const existing = await this.repo.findRequestBySubject(
      input.subjectType,
      input.subjectId,
    );
    if (existing) return existing;

    const request = await this.repo.insertRequest({
      policyId: input.policyId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      requestedByUserId: input.requestedByUserId ?? null,
      metadata: input.metadata ?? null,
    });

    if (!request) {
      throw new Error("Failed to create approval request");
    }

    const steps = Array.isArray((policy.steps as any)?.steps)
      ? ((policy.steps as any).steps as any[])
      : null;
    if (!steps || steps.length === 0) {
      throwBadRequest("Approval policy has no steps", ERROR_CODES.APPROVAL_POLICY_EMPTY_STEPS, { policyId: input.policyId });
    }

    await this.repo.insertSteps(
      steps.map((step, idx) => ({
        requestId: request.id,
        stepIndex: idx,
        status: "pending" as any,
        approverUserId: (step?.approverUserId as string | undefined) ?? null,
        payload: step ?? null,
      })),
    );

    return request;
  }

  async decideStep(input: {
    requestId: string;
    stepIndex: number;
    decision: "approve" | "reject";
    decidedByUserId: string;
    comment?: string | null;
  }) {
    const req = await this.repo.findRequestById(input.requestId);
    if (!req) throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { requestId: input.requestId });
    if (req.status !== "pending") {
      throwBadRequest("Approval request is not pending", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, { requestId: input.requestId, status: req.status });
    }

    const step = await this.repo.findStep(input.requestId, input.stepIndex);
    if (!step) throwNotFound("Approval step not found", ERROR_CODES.APPROVAL_STEP_NOT_FOUND, { requestId: input.requestId, stepIndex: input.stepIndex });
    if (step.status !== "pending") {
      throwBadRequest("Approval step already decided", ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED, { stepId: step.id, status: step.status });
    }
    if (step.approverUserId && step.approverUserId !== input.decidedByUserId) {
      throwBadRequest("Approval step is assigned to another approver", ERROR_CODES.INVALID_REQUEST, { stepId: step.id });
    }

    const nextStatus = input.decision === "approve" ? "approved" : "rejected";
    await this.repo.updateStep(step.id, {
      status: nextStatus,
      decidedByUserId: input.decidedByUserId,
      decidedAt: new Date(),
      comment: input.comment ?? null,
    });

    if (input.decision === "reject") {
      await this.repo.updateRequest(req.id, {
        status: "rejected",
        decidedAt: new Date(),
      });
      return { status: "rejected" as const };
    }

    // Advance to next step if any pending, else approve request.
    const hasPending = await this.repo.anyPendingStep(req.id);
    if (!hasPending) {
      await this.repo.updateRequest(req.id, {
        status: "approved",
        decidedAt: new Date(),
      });
      return { status: "approved" as const };
    }

    await this.repo.updateRequest(req.id, {
      currentStepIndex: input.stepIndex + 1,
      updatedAt: new Date(),
    });

    return { status: "pending" as const };
  }

  async findPendingStepByApprover(requestId: string, userId: string) {
    return this.repo.findPendingStepByApprover(requestId, userId);
  }

  async cancelApproval(approvalRequestId: string): Promise<void> {
    const req = await this.repo.findRequestById(approvalRequestId);
    if (!req) {
      throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { approvalRequestId });
    }
    if (req.status !== "pending") {
      throwBadRequest("Cannot cancel a non-pending approval request", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, { approvalRequestId, status: req.status });
    }

    // Cancel all pending steps
    const stepIds = req.currentStepIndex !== undefined
      ? Array.from({ length: req.currentStepIndex + 1 }, (_, i) => i)
      : [0];

    for (const stepIndex of stepIds) {
      const step = await this.repo.findStep(approvalRequestId, stepIndex);
      if (step?.status === "pending") {
        await this.repo.updateStep(step.id, {
          status: "skipped",
          decidedByUserId: null,
          decidedAt: new Date(),
        });
      }
    }

    await this.repo.updateRequest(approvalRequestId, {
      status: "cancelled",
      decidedAt: new Date(),
    });
  }
}
