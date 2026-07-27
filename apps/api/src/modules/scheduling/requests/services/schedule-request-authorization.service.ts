import { Injectable } from "@nestjs/common";
import { throwForbidden } from "../../../../shared/utils/http-error";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";
import type { ScheduleRequestRecord } from "../repositories/schedule-requests.repository.contract";

@Injectable()
export class ScheduleRequestAuthorizationService {
  async canReview(actor: AuthUser, request: ScheduleRequestRecord): Promise<void> {
    const permissions = actor.permissions ?? [];
    const isHR = permissions.includes("schedule:manage") || permissions.includes("schedule:edit:all") || permissions.includes("sys:all");
    const isManager = actor.employeeId && actor.employeeId === request.reviewedBy; // Manager check placeholder

    if (!isHR && !isManager) {
      throwForbidden("You do not have permission to review this schedule request", "FORBIDDEN");
    }
  }
}
