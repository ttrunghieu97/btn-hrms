import { Injectable } from "@nestjs/common";
import { throwForbidden } from "../../../../shared/utils/http-error";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class LeaveAuthorizationService {
  async canCreate(actor: AuthUser, targetEmployeeId: string): Promise<void> {
    const permissions = actor.permissions ?? [];
    const isSelf = actor.employeeId === targetEmployeeId;
    const isHR = permissions.includes("leave:manage") || permissions.includes("leave:create:all") || permissions.includes("sys:all");

    if (!isSelf && !isHR) {
      throwForbidden("You can only create leave requests for yourself", "FORBIDDEN");
    }
  }

  async canCancel(actor: AuthUser, requestEmployeeId: string): Promise<void> {
    const permissions = actor.permissions ?? [];
    const isSelf = actor.employeeId === requestEmployeeId;
    const isHR =
      actor.isSuperAdmin === true ||
      permissions.includes("leave:manage") ||
      permissions.includes("leave:edit:all") ||
      permissions.includes("leave:approve") ||
      permissions.includes("leave:approve:department") ||
      permissions.includes("sys:all") ||
      permissions.includes("ALL");

    if (!isSelf && !isHR) {
      throwForbidden("Cannot cancel another employee's leave request", "FORBIDDEN");
    }
  }
}
