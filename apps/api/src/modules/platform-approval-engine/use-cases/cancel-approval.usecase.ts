import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";
import { throwNotFound, throwBadRequest, throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

export type ApprovalCancelActor = Pick<AuthUser, "id"> &
  Partial<Pick<AuthUser, "isSuperAdmin" | "permissions" | "roles">>;

const ADMIN_CANCEL_PERMISSIONS = new Set<string>([
  Permissions.SYS_ALL,
  "ALL",
  Permissions.APPROVAL_POLICIES_EDIT,
  Permissions.APPROVAL_POLICIES_DELETE,
  "approval:manage",
]);

const ADMIN_CANCEL_ROLES = new Set<string>([
  "admin",
  "super_admin",
  "hr_admin",
  "system_admin",
]);

export function isAuthorizedApprovalCancelAdmin(actor: ApprovalCancelActor): boolean {
  if (actor.isSuperAdmin === true) return true;
  if (
    Array.isArray(actor.permissions) &&
    actor.permissions.some((p) => ADMIN_CANCEL_PERMISSIONS.has(p))
  ) {
    return true;
  }
  if (
    Array.isArray(actor.roles) &&
    actor.roles.some((r) => ADMIN_CANCEL_ROLES.has(String(r).toLowerCase()))
  ) {
    return true;
  }
  return false;
}

@Injectable()
export class CancelApprovalUseCase {
  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(
    approvalRequestId: string,
    actor: ApprovalCancelActor,
  ): Promise<void> {
    const actorUserId = typeof actor?.id === "string" ? actor.id.trim() : "";
    if (!actorUserId) {
      throwForbidden(
        "Authenticated user identity is required to cancel an approval request",
        ERROR_CODES.FORBIDDEN,
        { approvalRequestId },
      );
    }

    await this.repo.transaction(async (tx) => {
      const req = await this.repo.findRequestById(approvalRequestId, tx);
      if (!req) {
        throwNotFound(
          "Approval request not found",
          ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND,
          { approvalRequestId },
        );
      }

      const isRequester = Boolean(
        req.requestedByUserId && req.requestedByUserId === actorUserId,
      );
      const isAdmin = isAuthorizedApprovalCancelAdmin(actor);
      if (!isRequester && !isAdmin) {
        throwForbidden(
          "Only the requester or an authorized administrator may cancel this approval request",
          ERROR_CODES.FORBIDDEN,
          { approvalRequestId, userId: actorUserId },
        );
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

      await this.repo.skipPendingSteps(approvalRequestId, tx);

      if (typeof this.repo.updateRequestIfPending === "function") {
        const updatedReq = await this.repo.updateRequestIfPending(
          approvalRequestId,
          {
            status: "cancelled",
            decidedAt: now,
          },
          tx,
        );
        if (!updatedReq) {
          throwBadRequest(
            "Cannot cancel a non-pending approval request",
            ERROR_CODES.APPROVAL_REQUEST_NOT_PENDING,
            { approvalRequestId },
          );
        }
      } else {
        await this.repo.updateRequest(
          approvalRequestId,
          {
            status: "cancelled",
            decidedAt: now,
          },
          tx,
        );
      }

      await this.eventOutbox.stage(
        new ApprovalRequestCompletedEvent({
          idempotencyKey: `${approvalRequestId}:approval.request.completed`,
          approvalRequestId,
          policyKey,
          subjectType: req.subjectType,
          subjectId: req.subjectId,
          outcome: "cancelled",
          decidedByUserId: actorUserId,
          completedAt: now.toISOString(),
        }),
        tx,
      );
    });
  }
}
