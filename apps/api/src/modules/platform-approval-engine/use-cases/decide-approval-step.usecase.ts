import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ApprovalRequestDecidedEvent } from "../../../core/events/events/approval-request-decided.event";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";
import { throwNotFound, throwBadRequest, throwForbidden, throwConflict } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { DecideApprovalStepDto } from "../dto/decide-approval-step.dto";

function extractRequiredStepRole(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const role = record.approverRole ?? record.requiredRole ?? record.role;
  return typeof role === "string" && role.trim().length > 0 ? role.trim() : null;
}

@Injectable()
export class DecideApprovalStepUseCase {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(dto: DecideApprovalStepDto, userId: string, actorRoles?: string[]) {
    return this.repo.transaction(async (tx) => {
      const req = await this.repo.findRequestById(dto.requestId, tx);
      if (!req) {
        throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { requestId: dto.requestId });
      }
      if (req.status !== "pending") {
        throwBadRequest("Approval request is not pending", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, { requestId: dto.requestId, status: req.status });
      }

      if (req.requestedByUserId && req.requestedByUserId === userId) {
        throwForbidden(
          "Approvers cannot decide their own approval requests",
          ERROR_CODES.APPROVAL_SELF_APPROVAL_FORBIDDEN,
          { requestId: req.id, userId },
        );
      }

      if (
        req.currentStepIndex !== undefined &&
        req.currentStepIndex !== null &&
        dto.stepIndex !== req.currentStepIndex
      ) {
        throwBadRequest(
          `Can only decide current pending step (current step index is ${req.currentStepIndex})`,
          ERROR_CODES.INVALID_REQUEST,
          {
            requestId: req.id,
            currentStepIndex: req.currentStepIndex,
            requestedStepIndex: dto.stepIndex,
          },
        );
      }

      const step = await this.repo.findStep(dto.requestId, dto.stepIndex, tx);
      if (!step) {
        throwNotFound("Approval step not found", ERROR_CODES.APPROVAL_STEP_NOT_FOUND, { requestId: dto.requestId, stepIndex: dto.stepIndex });
      }
      if (step.status !== "pending") {
        throwBadRequest("Approval step already decided", ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED, { stepId: step.id, status: step.status });
      }

      let isDelegatedDecision = false;
      if (step.approverUserId && step.approverUserId !== userId) {
        const isDelegate =
          typeof this.repo.isUserActiveDelegateOf === "function"
            ? await this.repo.isUserActiveDelegateOf(userId, step.approverUserId)
            : false;
        if (!isDelegate) {
          throwBadRequest(
            "Approval step is assigned to another approver",
            ERROR_CODES.INVALID_REQUEST,
            { stepId: step.id },
          );
        }
        isDelegatedDecision = true;
      } else if (!step.approverUserId) {
        const requiredRole = extractRequiredStepRole(step.payload);
        if (requiredRole && Array.isArray(actorRoles)) {
          const normalizedRoles = actorRoles.map((r) => r.toLowerCase());
          if (
            !normalizedRoles.includes(requiredRole.toLowerCase()) &&
            !normalizedRoles.includes("admin")
          ) {
            throwForbidden(
              "User does not have the required role for this approval step",
              ERROR_CODES.APPROVAL_SELF_APPROVAL_FORBIDDEN,
              { stepId: step.id, requiredRole },
            );
          }
        }
      }

      const nextStatus = dto.decision === "approve" ? "approved" : "rejected";
      const decidedNow = new Date();
      const stepPatch = {
        status: nextStatus,
        decidedByUserId: userId,
        decidedAt: decidedNow,
        comment: isDelegatedDecision
          ? `[Delegated on behalf of ${step.approverUserId}] ${dto.comment ?? ""}`.trim()
          : (dto.comment ?? null),
      };

      if (typeof this.repo.updateStepIfPending === "function") {
        const updatedStep = await this.repo.updateStepIfPending(step.id, stepPatch, tx);
        if (!updatedStep) {
          throwBadRequest(
            "Approval step already decided",
            ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED,
            { stepId: step.id },
          );
        }
      } else {
        await this.repo.updateStep(step.id, stepPatch, tx);
      }

      let resolvedPolicyKey =
        typeof (req.metadata as Record<string, unknown> | null)?.policyKey === "string"
          ? String((req.metadata as Record<string, unknown>).policyKey)
          : "";
      if (!resolvedPolicyKey && req.policyId && typeof this.repo.findPolicyById === "function") {
        const policy = await this.repo.findPolicyById(req.policyId);
        if (policy?.key) resolvedPolicyKey = policy.key;
      }

      const decidedAtIso = decidedNow.toISOString();

      if (dto.decision === "reject") {
        if (typeof this.repo.skipPendingSteps === "function") {
          await this.repo.skipPendingSteps(req.id, tx);
        }
        const requestPatch = {
          status: "rejected",
          decidedAt: decidedNow,
        };
        if (typeof this.repo.updateRequestIfPending === "function") {
          const updatedReq = await this.repo.updateRequestIfPending(req.id, requestPatch, tx);
          if (!updatedReq) {
            throwBadRequest(
              "Approval request is not pending",
              ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
              { requestId: req.id },
            );
          }
        } else {
          await this.repo.updateRequest(req.id, requestPatch, tx);
        }

        const decidedEvent = new ApprovalRequestDecidedEvent({
          idempotencyKey: `${req.id}:${step.id}:approval.step.decided`,
          approvalRequestId: req.id,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          decision: "rejected",
          decidedByUserId: userId,
          decidedAt: decidedAtIso,
        });
        await this.eventOutbox.stage(decidedEvent, tx);

        const completedEvent = new ApprovalRequestCompletedEvent({
          idempotencyKey: `${req.id}:approval.request.completed`,
          approvalRequestId: req.id,
          policyKey: resolvedPolicyKey,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "rejected",
          completedAt: decidedAtIso,
          decidedByUserId: userId,
        });
        await this.eventOutbox.stage(completedEvent, tx);

        return { status: "rejected" as const, delegated: isDelegatedDecision };
      }

      const hasPending = await this.repo.anyPendingStep(req.id, tx);
      if (!hasPending) {
        const requestPatch = {
          status: "approved",
          decidedAt: decidedNow,
        };
        if (typeof this.repo.updateRequestIfPending === "function") {
          const updatedReq = await this.repo.updateRequestIfPending(req.id, requestPatch, tx);
          if (!updatedReq) {
            throwBadRequest(
              "Approval request is not pending",
              ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
              { requestId: req.id },
            );
          }
        } else {
          await this.repo.updateRequest(req.id, requestPatch, tx);
        }

        const decidedEvent = new ApprovalRequestDecidedEvent({
          idempotencyKey: `${req.id}:${step.id}:approval.step.decided`,
          approvalRequestId: req.id,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          decision: "approved",
          decidedByUserId: userId,
          decidedAt: decidedAtIso,
        });
        await this.eventOutbox.stage(decidedEvent, tx);

        const completedEvent = new ApprovalRequestCompletedEvent({
          idempotencyKey: `${req.id}:approval.request.completed`,
          approvalRequestId: req.id,
          policyKey: resolvedPolicyKey,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "approved",
          completedAt: decidedAtIso,
          decidedByUserId: userId,
        });
        await this.eventOutbox.stage(completedEvent, tx);

        return { status: "approved" as const, delegated: isDelegatedDecision };
      }

      const advancePatch = {
        currentStepIndex: dto.stepIndex + 1,
        updatedAt: decidedNow,
      };
      if (typeof this.repo.updateRequestIfPending === "function") {
        const updatedReq = await this.repo.updateRequestIfPending(
          req.id,
          advancePatch,
          tx,
        );
        if (!updatedReq) {
          throwConflict(
            "Approval request state was concurrently modified",
            ERROR_CODES.CONFLICT,
            { requestId: req.id, stepIndex: dto.stepIndex },
          );
        }
      } else {
        await this.repo.updateRequest(req.id, advancePatch, tx);
      }

      const decidedEvent = new ApprovalRequestDecidedEvent({
        idempotencyKey: `${req.id}:${step.id}:approval.step.decided`,
        approvalRequestId: req.id,
        subjectType: req.subjectType,
        subjectId: req.subjectId,
        decision: "approved",
        decidedByUserId: userId,
        decidedAt: decidedAtIso,
      });
      await this.eventOutbox.stage(decidedEvent, tx);

      return { status: "pending" as const, delegated: isDelegatedDecision };
    });
  }
}
