import { Injectable } from "@nestjs/common";
import { hasPermission } from "@project/permissions";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";
import type { ScheduleRequestRecord } from "../repositories/schedule-requests.repository.contract";

@Injectable()
export class ScheduleRequestAuthorizationService {
  async canReview(actor: AuthUser, request: ScheduleRequestRecord): Promise<void> {
    if (
      !actor.isSuperAdmin &&
      actor.employeeId &&
      String(actor.employeeId) === String(request.employeeId)
    ) {
      throwForbidden(
        "You cannot review your own schedule request",
        ERROR_CODES.APPROVAL_SELF_APPROVAL_FORBIDDEN,
      );
    }

    const isHR =
      Boolean(actor.isSuperAdmin) ||
      hasPermission(actor.permissions ?? [], Permissions.SCHEDULE_EDIT_ALL);
    const isManager =
      Boolean(actor.employeeId) &&
      Boolean(request.reviewedBy) &&
      String(actor.employeeId) === String(request.reviewedBy);

    if (!isHR && !isManager) {
      throwForbidden(
        "You do not have permission to review this schedule request",
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
}
