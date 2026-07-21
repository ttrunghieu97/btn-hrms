import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

// ─── View Employee ───────────────────────────────────────────────────────────
// Allows: explicit permission OR self-access OR same-department access
class ViewEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_VIEW_SELF,
    Permissions.EMPLOYEES_VIEW_DEPARTMENT,
    Permissions.EMPLOYEES_VIEW_ALL,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) return true;
    if (user.permissions?.includes(Permissions.EMPLOYEES_VIEW_ALL)) return true;
    if (!resource) return false;
    if (
      user.permissions?.includes(Permissions.EMPLOYEES_VIEW_DEPARTMENT) &&
      resource.departmentId &&
      user.departmentId &&
      String(user.departmentId) === String(resource.departmentId)
    )
      return true;
    if (
      user.permissions?.includes(Permissions.EMPLOYEES_VIEW_SELF) &&
      resource.id &&
      user.employeeId &&
      String(resource.id) === String(user.employeeId)
    )
      return true;
    if (
      user.permissions?.includes(Permissions.EMPLOYEES_VIEW_SELF) &&
      resource.userId &&
      user.id &&
      String(resource.userId) === String(user.id)
    )
      return true;
    if (
      user.permissions?.includes(Permissions.EMPLOYEES_VIEW_SELF) &&
      resource.username &&
      user.username === resource.username
    )
      return true;
    return false;
  }
}

class ViewOwnEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewOwnEmployee";

  handle(user: AuthUser): boolean {
    return Boolean(user.id);
  }
}

class ViewSensitiveEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewSensitiveEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_VIEW_SENSITIVE,
    Permissions.EMPLOYEES_MANAGE_SENSITIVE,
  ];

  handle(user: AuthUser): boolean {
    return (
      user.isSuperAdmin === true ||
      user.permissions?.includes(Permissions.SYS_ALL) === true ||
      user.permissions?.includes(Permissions.EMPLOYEES_VIEW_SENSITIVE) === true ||
      user.permissions?.includes(Permissions.EMPLOYEES_MANAGE_SENSITIVE) === true
    );
  }
}

// ─── Create / Edit / Delete Employee ────────────────────────────────────────
class CreateEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "CreateEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_CREATE,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.EMPLOYEES_CREATE) ||
      user.permissions?.includes(Permissions.EMPLOYEES_MANAGE)
    );
  }
}

class EditEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "EditEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.EMPLOYEES_EDIT) ||
      user.permissions?.includes(Permissions.EMPLOYEES_MANAGE)
    );
  }
}

class DeleteEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_DELETE,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.EMPLOYEES_DELETE) ||
      user.permissions?.includes(Permissions.EMPLOYEES_MANAGE)
    ) ?? false;
  }
}

class ResetEmployeePasswordPolicyHandler implements PolicyHandler {
  readonly policyName = "ResetEmployeePassword";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_RESET_PASSWORD,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.EMPLOYEES_RESET_PASSWORD) ||
      user.permissions?.includes(Permissions.EMPLOYEES_MANAGE)
    );
  }
}

class ManageEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ManageEmployee";
  readonly requiredAnyOfPermissions = [Permissions.EMPLOYEES_MANAGE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.EMPLOYEES_MANAGE) ?? false;
  }
}

class TerminateEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "TerminateEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_MANAGE,
    Permissions.EMPLOYEES_MANAGE_SENSITIVE,
  ];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin) return true;
    if (user.permissions?.includes(Permissions.SYS_ALL)) return true;
    if (user.permissions?.includes(Permissions.EMPLOYEES_MANAGE)) return true;
    if (user.permissions?.includes(Permissions.EMPLOYEES_MANAGE_SENSITIVE)) return true;
    return false;
  }
}

class PurgeEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "PurgeEmployee";
  readonly requiredAnyOfPermissions = [];
  handle(user: AuthUser): boolean {
    return user.isSuperAdmin || user.permissions?.includes("ALL");
  }
}

export const EmployeePolicies = {
  view: new ViewEmployeePolicyHandler(),
  viewSelf: new ViewOwnEmployeePolicyHandler(),
  viewSensitive: new ViewSensitiveEmployeePolicyHandler(),
  terminate: new TerminateEmployeePolicyHandler(),
  create: new CreateEmployeePolicyHandler(),
  edit: new EditEmployeePolicyHandler(),
  resetPassword: new ResetEmployeePasswordPolicyHandler(),
  delete: new DeleteEmployeePolicyHandler(),
  manage: new ManageEmployeePolicyHandler(),
  purge: new PurgeEmployeePolicyHandler(),
};
