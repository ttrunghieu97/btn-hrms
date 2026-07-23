/**
 * IdentityPolicy — covers Users, Roles, and Audit Logs.
 */
import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

// ─── Users ───────────────────────────────────────────────────────────────────

class ViewUserPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewUser";
  readonly requiredAnyOfPermissions = [Permissions.USERS_VIEW];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.USERS_VIEW) ?? false;
  }
}
class EditUserPolicyHandler implements PolicyHandler {
  readonly policyName = "EditUser";
  readonly requiredAnyOfPermissions = [Permissions.USERS_EDIT];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.USERS_EDIT) ?? false;
  }
}
class DeleteUserPolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteUser";
  readonly requiredAnyOfPermissions = [Permissions.USERS_DELETE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.USERS_DELETE) ?? false;
  }
}
class ManageUserPermissionsPolicyHandler implements PolicyHandler {
  readonly policyName = "ManageUserPermissions";
  readonly requiredAnyOfPermissions = [Permissions.USERS_EDIT];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.USERS_EDIT) ?? false;
  }
}

// ─── Roles ───────────────────────────────────────────────────────────────────

class ViewRolePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewRole";
  readonly requiredAnyOfPermissions = [Permissions.ROLES_VIEW];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.ROLES_VIEW) ?? false;
  }
}
class ManageRolePolicyHandler implements PolicyHandler {
  readonly policyName = "ManageRole";
  readonly requiredAnyOfPermissions = [
    Permissions.ROLES_CREATE,
    Permissions.ROLES_EDIT,
    Permissions.ROLES_DELETE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ROLES_CREATE) ||
      perms.includes(Permissions.ROLES_EDIT) ||
      perms.includes(Permissions.ROLES_DELETE)
    );
  }
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

class ViewAuditLogPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAuditLog";
  readonly requiredAnyOfPermissions = [Permissions.AUDIT_LOGS_VIEW];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.AUDIT_LOGS_VIEW) ?? false;
  }
}

// ─── Files ───────────────────────────────────────────────────────────────────
// Access to any stored file requires at least one view permission on
// any domain (prevents unauthenticated file URL enumeration).

const FILE_VIEW_PERMS = new Set<string>([
  Permissions.EMPLOYEES_VIEW,
  Permissions.ATTENDANCE_VIEW_SELF,
  Permissions.ATTENDANCE_VIEW_DEPARTMENT,
  Permissions.ATTENDANCE_VIEW_ALL,
  Permissions.SCHEDULE_VIEW_SELF,
  Permissions.SCHEDULE_VIEW_DEPARTMENT,
  Permissions.SCHEDULE_VIEW_ALL,
  Permissions.TASKS_VIEW,
  Permissions.TASKS_VIEW_SELF,
  Permissions.PAYROLL_VIEW,
  Permissions.USERS_VIEW,
]);

class ViewFilePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewFile";
  readonly requiredAnyOfPermissions = Array.from(FILE_VIEW_PERMS);
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (user.permissions ?? []).some((p) => FILE_VIEW_PERMS.has(p));
  }
}

class UploadFilePolicyHandler implements PolicyHandler {
  readonly policyName = "UploadFile";
  readonly requiredAnyOfPermissions = [Permissions.FILES_UPLOAD];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.FILES_UPLOAD) ?? false;
  }
}

class ViewOwnUserPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewOwnUser";
  handle(user: AuthUser): boolean {
    return Boolean(user.id);
  }
}

export const UserPolicies = {
  view: new ViewUserPolicyHandler(),
  viewSelf: new ViewOwnUserPolicyHandler(),
  edit: new EditUserPolicyHandler(),
  delete: new DeleteUserPolicyHandler(),
  managePermissions: new ManageUserPermissionsPolicyHandler(),
};

export const RolePolicies = {
  view: new ViewRolePolicyHandler(),
  manage: new ManageRolePolicyHandler(),
};

export const AuditLogPolicies = {
  view: new ViewAuditLogPolicyHandler(),
};

export const FilePolicies = {
  view: new ViewFilePolicyHandler(),
  upload: new UploadFilePolicyHandler(),
};
