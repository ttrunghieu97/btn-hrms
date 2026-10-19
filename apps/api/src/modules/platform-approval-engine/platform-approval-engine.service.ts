import { Injectable, Optional } from "@nestjs/common";
import { throwBadRequest, throwConflict, throwForbidden, throwNotFound } from "../../shared/utils/http-error";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { EventOutboxService } from "../../core/events/event-outbox.service";
import { ApprovalRequestCreatedEvent } from "../../core/events/events/approval-request-created.event";
import { ApprovalRequestDecidedEvent } from "../../core/events/events/approval-request-decided.event";
import { ApprovalRequestCompletedEvent } from "../../core/events/events/approval-request-completed.event";
import { PlatformApprovalEngineRepository } from "./repositories/platform-approval-engine.repository";
import type { AppDatabase } from "../../infrastructure/database/database-client.type";

@Injectable()
export class PlatformApprovalEngineService {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    @Optional() private readonly eventOutbox?: EventOutboxService,
  ) {}

  private withTx<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    if (typeof this.repo.transaction === "function") {
      return this.repo.transaction(fn);
    }
    return fn(undefined as unknown as AppDatabase);
  }

  private extractRequiredStepRole(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;
    const role = record.approverRole ?? record.requiredRole ?? record.role;
    return typeof role === "string" && role.trim().length > 0 ? role.trim() : null;
  }

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
    if (!policy) {
      throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, {
        policyId: input.policyId,
      });
    }

    const steps = Array.isArray((policy.steps as any)?.steps)
      ? ((policy.steps as any).steps as any[])
      : null;
    if (!steps || steps.length === 0) {
      throwBadRequest("Approval policy has no steps", ERROR_CODES.APPROVAL_POLICY_EMPTY_STEPS, {
        policyId: input.policyId,
      });
    }

    return this.withTx(async (tx) => {
      // Idempotent: reuse existing approval request for this subject
      const existing = tx
        ? await this.repo.findRequestBySubject(input.subjectType, input.subjectId, tx)
        : await this.repo.findRequestBySubject(input.subjectType, input.subjectId);
      if (existing) return existing;

      const requestPayload = {
        policyId: input.policyId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        requestedByUserId: input.requestedByUserId ?? null,
        metadata: input.metadata ?? null,
      };
      const request = tx
        ? await this.repo.insertRequest(requestPayload, tx)
        : await this.repo.insertRequest(requestPayload);

      if (!request) {
        throw new Error("Failed to create approval request");
      }

      const stepRows = steps.map((step, idx) => ({
        requestId: request.id,
        stepIndex: idx,
        status: "pending" as any,
        approverUserId: (step?.approverUserId as string | undefined) ?? null,
        payload: step ?? null,
      }));
      if (tx) {
        await this.repo.insertSteps(stepRows, tx);
      } else {
        await this.repo.insertSteps(stepRows);
      }

      if (this.eventOutbox) {
        await this.eventOutbox.stage(
          new ApprovalRequestCreatedEvent({
            idempotencyKey: `${request.id}:approval.request.created`,
            approvalRequestId: request.id,
            policyId: input.policyId,
            policyKey: (policy as any).key ?? "",
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            requestedByUserId: input.requestedByUserId ?? null,
            requestedAt: new Date().toISOString(),
          }),
          tx,
        );
      }

      return request;
    });
  }

  async decideStep(input: {
    requestId: string;
    stepIndex: number;
    decision: "approve" | "reject";
    decidedByUserId: string;
    decidedByRoles?: string[];
    comment?: string | null;
  }) {
    return this.withTx(async (tx) => {
      const req = tx
        ? await this.repo.findRequestById(input.requestId, tx)
        : await this.repo.findRequestById(input.requestId);
      if (!req) {
        throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, {
          requestId: input.requestId,
        });
      }
      if (req.status !== "pending") {
        throwBadRequest("Approval request is not pending", ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING, {
          requestId: input.requestId,
          status: req.status,
        });
      }

      if (req.requestedByUserId && req.requestedByUserId === input.decidedByUserId) {
        throwForbidden(
          "Cannot approve or reject your own request",
          ERROR_CODES.APPROVAL_SELF_APPROVAL_FORBIDDEN,
          { requestId: req.id, userId: input.decidedByUserId },
        );
      }

      if (
        req.currentStepIndex !== undefined &&
        req.currentStepIndex !== null &&
        input.stepIndex !== req.currentStepIndex
      ) {
        throwBadRequest(
          `Must decide current step (${req.currentStepIndex}) before step ${input.stepIndex}`,
          ERROR_CODES.INVALID_REQUEST,
          { currentStepIndex: req.currentStepIndex, requestedStepIndex: input.stepIndex },
        );
      }

      const step = tx
        ? await this.repo.findStep(input.requestId, input.stepIndex, tx)
        : await this.repo.findStep(input.requestId, input.stepIndex);
      if (!step) {
        throwNotFound("Approval step not found", ERROR_CODES.APPROVAL_STEP_NOT_FOUND, {
          requestId: input.requestId,
          stepIndex: input.stepIndex,
        });
      }
      if (step.status !== "pending") {
        throwBadRequest("Approval step already decided", ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED, {
          stepId: step.id,
          status: step.status,
        });
      }

      let isDelegatedDecision = false;
      if (step.approverUserId && step.approverUserId !== input.decidedByUserId) {
        const isDelegate =
          typeof this.repo.isUserActiveDelegateOf === "function"
            ? await this.repo.isUserActiveDelegateOf(input.decidedByUserId, step.approverUserId)
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
        const requiredRole = this.extractRequiredStepRole((step as any).payload);
        if (requiredRole && Array.isArray(input.decidedByRoles)) {
          const normalizedRoles = input.decidedByRoles.map((r) => r.toLowerCase());
          if (!normalizedRoles.includes(requiredRole.toLowerCase())) {
            throwForbidden(
              `Approval step requires role ${requiredRole}`,
              ERROR_CODES.APPROVAL_SELF_APPROVAL_FORBIDDEN,
              { stepId: step.id, requiredRole },
            );
          }
        }
      }

      const policy =
        req.policyId && typeof this.repo.findPolicyById === "function"
          ? await this.repo.findPolicyById(req.policyId)
          : null;
      const policyKey = (policy as any)?.key ?? "";

      const nextStatus = input.decision === "approve" ? "approved" : "rejected";
      const now = new Date();
      const effectiveComment = isDelegatedDecision
        ? `[Delegated on behalf of ${step.approverUserId}] ${input.comment ?? ""}`.trim()
        : input.comment ?? null;

      const stepPatch = {
        status: nextStatus,
        decidedByUserId: input.decidedByUserId,
        decidedAt: now,
        comment: effectiveComment,
      };
      if (typeof this.repo.updateStepIfPending === "function") {
        const updatedStep = tx
          ? await this.repo.updateStepIfPending(step.id, stepPatch, tx)
          : await this.repo.updateStepIfPending(step.id, stepPatch);
        if (!updatedStep) {
          throwBadRequest(
            "Approval step already decided",
            ERROR_CODES.APPROVAL_STEP_ALREADY_DECIDED,
            { stepId: step.id },
          );
        }
      } else if (tx) {
        await this.repo.updateStep(step.id, stepPatch, tx);
      } else {
        await this.repo.updateStep(step.id, stepPatch);
      }

      if (this.eventOutbox) {
        await this.eventOutbox.stage(
          new ApprovalRequestDecidedEvent({
            idempotencyKey: `${req.id}:${step.id}:approval.step.decided`,
            approvalRequestId: req.id,
            subjectType: req.subjectType,
            subjectId: req.subjectId,
            decision: nextStatus,
            decidedByUserId: input.decidedByUserId,
            decidedAt: now.toISOString(),
          }),
          tx,
        );
      }

      if (input.decision === "reject") {
        if (typeof this.repo.skipPendingSteps === "function") {
          if (tx) {
            await this.repo.skipPendingSteps(req.id, tx);
          } else {
            await this.repo.skipPendingSteps(req.id);
          }
        }
        const rejectPatch = {
          status: "rejected",
          decidedAt: now,
        };
        if (typeof this.repo.updateRequestIfPending === "function") {
          const updatedReq = tx
            ? await this.repo.updateRequestIfPending(req.id, rejectPatch, tx)
            : await this.repo.updateRequestIfPending(req.id, rejectPatch);
          if (!updatedReq) {
            throwBadRequest(
              "Approval request is not pending",
              ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
              { requestId: req.id },
            );
          }
        } else if (tx) {
          await this.repo.updateRequest(req.id, rejectPatch, tx);
        } else {
          await this.repo.updateRequest(req.id, rejectPatch);
        }

        if (this.eventOutbox) {
          await this.eventOutbox.stage(
            new ApprovalRequestCompletedEvent({
              idempotencyKey: `${req.id}:approval.request.completed`,
              approvalRequestId: req.id,
              policyKey,
              subjectType: req.subjectType,
              subjectId: req.subjectId,
              outcome: "rejected",
              decidedByUserId: input.decidedByUserId,
              completedAt: now.toISOString(),
            }),
            tx,
          );
        }

        return { status: "rejected" as const, delegated: isDelegatedDecision };
      }

      // Advance to next step if any pending, else approve request.
      const hasPending = tx
        ? await this.repo.anyPendingStep(req.id, tx)
        : await this.repo.anyPendingStep(req.id);
      if (!hasPending) {
        const approvePatch = {
          status: "approved",
          decidedAt: now,
        };
        if (typeof this.repo.updateRequestIfPending === "function") {
          const updatedReq = tx
            ? await this.repo.updateRequestIfPending(req.id, approvePatch, tx)
            : await this.repo.updateRequestIfPending(req.id, approvePatch);
          if (!updatedReq) {
            throwBadRequest(
              "Approval request is not pending",
              ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
              { requestId: req.id },
            );
          }
        } else if (tx) {
          await this.repo.updateRequest(req.id, approvePatch, tx);
        } else {
          await this.repo.updateRequest(req.id, approvePatch);
        }

        if (this.eventOutbox) {
          await this.eventOutbox.stage(
            new ApprovalRequestCompletedEvent({
              idempotencyKey: `${req.id}:approval.request.completed`,
              approvalRequestId: req.id,
              policyKey,
              subjectType: req.subjectType,
              subjectId: req.subjectId,
              outcome: "approved",
              decidedByUserId: input.decidedByUserId,
              completedAt: now.toISOString(),
            }),
            tx,
          );
        }

        return { status: "approved" as const, delegated: isDelegatedDecision };
      }

      const advancePatch = {
        currentStepIndex: input.stepIndex + 1,
        updatedAt: now,
      };
      if (typeof this.repo.updateRequestIfPending === "function") {
        const updatedReq = tx
          ? await this.repo.updateRequestIfPending(req.id, advancePatch, tx)
          : await this.repo.updateRequestIfPending(req.id, advancePatch);
        if (!updatedReq) {
          throwConflict(
            "Approval request state was concurrently modified",
            ERROR_CODES.CONFLICT,
            { requestId: req.id, stepIndex: input.stepIndex },
          );
        }
      } else if (tx) {
        await this.repo.updateRequest(req.id, advancePatch, tx);
      } else {
        await this.repo.updateRequest(req.id, advancePatch);
      }

      return { status: "pending" as const, delegated: isDelegatedDecision };
    });
  }

  async findPendingStepByApprover(requestId: string, userId: string) {
    const directStep = await this.repo.findPendingStepByApprover(requestId, userId);
    if (directStep) return directStep;

    if (
      typeof this.repo.findRequestById === "function" &&
      typeof this.repo.findStep === "function" &&
      typeof this.repo.isUserActiveDelegateOf === "function"
    ) {
      const req = await this.repo.findRequestById(requestId);
      if (req && req.status === "pending") {
        const currentStep = await this.repo.findStep(requestId, req.currentStepIndex ?? 0);
        if (currentStep && currentStep.status === "pending" && currentStep.approverUserId) {
          const isDelegate = await this.repo.isUserActiveDelegateOf(
            userId,
            currentStep.approverUserId,
          );
          if (isDelegate) {
            return currentStep;
          }
        }
      }
    }

    return null;
  }

  async cancelApproval(
    approvalRequestId: string,
    actor?: {
      id: string;
      isSuperAdmin?: boolean;
      permissions?: string[];
      roles?: string[];
    },
  ): Promise<void> {
    await this.withTx(async (tx) => {
      const req = tx
        ? await this.repo.findRequestById(approvalRequestId, tx)
        : await this.repo.findRequestById(approvalRequestId);
      if (!req) {
        throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, {
          approvalRequestId,
        });
      }

      if (actor) {
        const actorUserId = typeof actor.id === "string" ? actor.id.trim() : "";
        const isRequester = Boolean(
          actorUserId && req.requestedByUserId && req.requestedByUserId === actorUserId,
        );
        const isAdmin =
          actor.isSuperAdmin === true ||
          (Array.isArray(actor.permissions) &&
            actor.permissions.some((p) =>
              ["sys:all", "ALL", "approval-policies:edit", "approval-policies:delete", "approval:manage"].includes(p),
            )) ||
          (Array.isArray(actor.roles) &&
            actor.roles.some((r) =>
              ["admin", "super_admin", "hr_admin", "system_admin"].includes(
                String(r).toLowerCase(),
              ),
            ));
        if (!isRequester && !isAdmin) {
          throwForbidden(
            "Only the requester or an authorized administrator may cancel this approval request",
            ERROR_CODES.FORBIDDEN,
            { approvalRequestId, userId: actorUserId },
          );
        }
      }

      if (req.status !== "pending") {
        throwBadRequest(
          "Cannot cancel a non-pending approval request",
          ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
          { approvalRequestId, status: req.status },
        );
      }

      const policy =
        req.policyId && typeof this.repo.findPolicyById === "function"
          ? await this.repo.findPolicyById(req.policyId)
          : null;
      const policyKey = (policy as any)?.key ?? "";
      const now = new Date();

      if (typeof this.repo.skipPendingSteps === "function") {
        if (tx) {
          await this.repo.skipPendingSteps(approvalRequestId, tx);
        } else {
          await this.repo.skipPendingSteps(approvalRequestId);
        }
      } else {
        const stepIds =
          req.currentStepIndex !== undefined
            ? Array.from({ length: req.currentStepIndex + 1 }, (_, i) => i)
            : [0];

        for (const stepIndex of stepIds) {
          const step = tx
            ? await this.repo.findStep(approvalRequestId, stepIndex, tx)
            : await this.repo.findStep(approvalRequestId, stepIndex);
          if (step?.status === "pending") {
            const skipPatch = {
              status: "skipped",
              decidedByUserId: null,
              decidedAt: now,
            };
            if (tx) {
              await this.repo.updateStep(step.id, skipPatch, tx);
            } else {
              await this.repo.updateStep(step.id, skipPatch);
            }
          }
        }
      }

      const cancelPatch = {
        status: "cancelled",
        decidedAt: now,
      };
      if (typeof this.repo.updateRequestIfPending === "function") {
        const updatedReq = tx
          ? await this.repo.updateRequestIfPending(approvalRequestId, cancelPatch, tx)
          : await this.repo.updateRequestIfPending(approvalRequestId, cancelPatch);
        if (!updatedReq) {
          throwBadRequest(
            "Cannot cancel a non-pending approval request",
            ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
            { approvalRequestId },
          );
        }
      } else if (tx) {
        await this.repo.updateRequest(approvalRequestId, cancelPatch, tx);
      } else {
        await this.repo.updateRequest(approvalRequestId, cancelPatch);
      }

      if (this.eventOutbox) {
        await this.eventOutbox.stage(
          new ApprovalRequestCompletedEvent({
            idempotencyKey: `${approvalRequestId}:approval.request.completed`,
            approvalRequestId,
            policyKey,
            subjectType: req.subjectType,
            subjectId: req.subjectId,
            outcome: "cancelled",
            ...(actor?.id ? { decidedByUserId: actor.id } : {}),
            completedAt: now.toISOString(),
          }),
          tx,
        );
      }
    });
  }
}
