import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./base.policy";
import { Permissions } from "../permissions/permissions.registry";

class ViewLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_VIEW];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.LEAVE_VIEW) ?? false;
  }
}

class CreateLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_CREATE];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.LEAVE_CREATE) ?? false;
  }
}

class EditLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_EDIT];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.LEAVE_EDIT) ?? false;
  }
}

class ApproveLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_APPROVE];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.LEAVE_APPROVE) ?? false;
  }
}

class ViewLeaveBalancePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [
    Permissions.LEAVE_VIEW_SELF,
    Permissions.LEAVE_VIEW_DEPARTMENT,
    Permissions.LEAVE_VIEW_ALL,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    if (perms.includes(Permissions.LEAVE_VIEW_ALL)) return true;
    if (!resource) return false;
    const employeeId = resource.id ?? resource.employeeId;
    if (
      perms.includes(Permissions.LEAVE_VIEW_DEPARTMENT) &&
      resource.departmentId &&
      user.departmentId &&
      String(resource.departmentId) === String(user.departmentId)
    )
      return true;
    return (
      perms.includes(Permissions.LEAVE_VIEW_SELF) &&
      employeeId &&
      user.employeeId &&
      String(employeeId) === String(user.employeeId)
    );
  }
}

export const LeavePolicies = {
  view: new ViewLeavePolicyHandler(),
  create: new CreateLeavePolicyHandler(),
  edit: new EditLeavePolicyHandler(),
  approve: new ApproveLeavePolicyHandler(),
  viewBalance: new ViewLeaveBalancePolicyHandler(),
};
