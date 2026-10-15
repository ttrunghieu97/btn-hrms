import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./base.policy";
import { Permissions } from "../permissions/permissions.registry";

class ViewLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [
    Permissions.LEAVE_VIEW,
    Permissions.LEAVE_VIEW_ALL,
    Permissions.LEAVE_VIEW_DEPARTMENT,
    Permissions.LEAVE_VIEW_SELF,
  ];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.LEAVE_VIEW) ||
      perms.includes(Permissions.LEAVE_VIEW_ALL) ||
      perms.includes(Permissions.LEAVE_VIEW_DEPARTMENT) ||
      perms.includes(Permissions.LEAVE_VIEW_SELF) ||
      perms.includes("leave:manage")
    );
  }
}

class CreateLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_CREATE, "leave:request"];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.LEAVE_CREATE) ||
      perms.includes("leave:request") ||
      perms.includes("leave:manage")
    );
  }
}

class EditLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_EDIT];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.LEAVE_EDIT) ?? false;
  }
}

class ApproveLeavePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.LEAVE_APPROVE];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
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
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
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
