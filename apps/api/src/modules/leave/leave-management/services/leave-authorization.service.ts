import { Injectable } from "@nestjs/common";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

export interface LeaveViewScope {
  tier: "all" | "department" | "self";
  departmentId?: string;
  employeeId?: string;
}

@Injectable()
export class LeaveAuthorizationService {
  resolveViewScope(actor: AuthUser): LeaveViewScope {
    const permissions = actor.permissions ?? [];
    if (
      actor.isSuperAdmin === true ||
      permissions.includes("sys:all") ||
      permissions.includes("ALL") ||
      permissions.includes("leave:manage") ||
      permissions.includes("leave:view:all") ||
      permissions.includes("leave:view")
    ) {
      return { tier: "all" };
    }

    if (
      permissions.includes("leave:view:department") ||
      permissions.includes("leave:approve:department")
    ) {
      if (actor.departmentId) {
        return { tier: "department", departmentId: actor.departmentId };
      }
      if (permissions.includes("leave:view:self") && actor.employeeId) {
        return { tier: "self", employeeId: actor.employeeId };
      }
      throwForbidden(
        "Missing department context for department-scoped leave query",
        ERROR_CODES.FORBIDDEN,
        { reason: "SCOPE_CONTEXT_MISSING", tier: "department" },
      );
    }

    if (permissions.includes("leave:view:self")) {
      if (!actor.employeeId) {
        throwForbidden(
          "Missing employee context for self-scoped leave query",
          ERROR_CODES.FORBIDDEN,
          { reason: "SCOPE_CONTEXT_MISSING", tier: "self" },
        );
      }
      return { tier: "self", employeeId: actor.employeeId };
    }

    throwForbidden(
      "Insufficient permissions to view leave requests",
      ERROR_CODES.FORBIDDEN,
      { reason: "INSUFFICIENT_SCOPE", module: "leave" },
    );
  }

  assertCanViewRequest(
    actor: AuthUser,
    request: {
      employeeId: string;
      employee?: { departmentId?: string | null } | null;
    },
  ): void {
    const scope = this.resolveViewScope(actor);
    if (scope.tier === "all") return;

    if (scope.tier === "department") {
      const requestDeptId = request.employee?.departmentId;
      if (
        (requestDeptId && String(requestDeptId) === String(scope.departmentId)) ||
        (actor.employeeId && String(request.employeeId) === String(actor.employeeId))
      ) {
        return;
      }
      throwForbidden(
        "You can only view leave requests within your department",
        ERROR_CODES.FORBIDDEN,
        { reason: "DEPARTMENT_SCOPE_VIOLATION" },
      );
    }

    if (scope.tier === "self") {
      if (String(request.employeeId) === String(scope.employeeId)) {
        return;
      }
      throwForbidden(
        "You can only view your own leave requests",
        ERROR_CODES.FORBIDDEN,
        { reason: "SELF_SCOPE_VIOLATION" },
      );
    }
  }

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
