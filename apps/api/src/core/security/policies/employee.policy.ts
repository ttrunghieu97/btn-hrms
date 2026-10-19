import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

function hasPerm(user: AuthUser, perm: string): boolean {
  const perms = user.permissions;
  if (!perms) return false;
  if (perms.includes(perm)) return true;
  if (perm.startsWith("employee:")) {
    return perms.includes(`employees:${perm.slice("employee:".length)}`);
  }
  return false;
}

// ─── View Employee ───────────────────────────────────────────────────────────
// Allows: explicit permission OR self-access OR same-department access
class ViewEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_VIEW,
    Permissions.EMPLOYEES_VIEW_SELF,
    Permissions.EMPLOYEES_VIEW_DEPARTMENT,
    Permissions.EMPLOYEES_VIEW_ALL,
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_UPDATE_ALL,
    Permissions.EMPLOYEES_MANAGE,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) return true;
    if (
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE)
    )
      return true;

    const isDeptScoped = hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT);
    if (isDeptScoped) {
      if (!resource) return true;
      if (
        resource.departmentId &&
        user.departmentId &&
        String(user.departmentId) === String(resource.departmentId)
      )
        return true;
      if (
        resource.id &&
        user.employeeId &&
        String(resource.id) === String(user.employeeId)
      )
        return true;
      if (
        resource.userId &&
        user.id &&
        String(resource.userId) === String(user.id)
      )
        return true;
      return false;
    }

    const isSelfScoped = hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF);
    if (isSelfScoped) {
      if (!resource) return true;
      if (
        resource.id &&
        user.employeeId &&
        String(resource.id) === String(user.employeeId)
      )
        return true;
      if (
        resource.userId &&
        user.id &&
        String(resource.userId) === String(user.id)
      )
        return true;
      if (
        resource.username &&
        user.username === resource.username
      )
        return true;
      return false;
    }

    if (
      hasPerm(user, Permissions.EMPLOYEES_VIEW) ||
      hasPerm(user, Permissions.EMPLOYEES_EDIT)
    )
      return true;

    return false;
  }
}

class ViewAllEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAllEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_VIEW,
    Permissions.EMPLOYEES_VIEW_ALL,
    Permissions.EMPLOYEES_CREATE,
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_UPDATE_ALL,
    Permissions.EMPLOYEES_MANAGE,
  ];

  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) return true;
    if (
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE)
    )
      return true;
    if (
      hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)
    ) {
      return false;
    }
    return (
      hasPerm(user, Permissions.EMPLOYEES_VIEW) ||
      hasPerm(user, Permissions.EMPLOYEES_EDIT) ||
      hasPerm(user, Permissions.EMPLOYEES_CREATE)
    );
  }
}

class ApproveTransferEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ApproveTransferEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_UPDATE_ALL,
    Permissions.EMPLOYEES_MANAGE,
    Permissions.APPROVAL_REQUESTS_DECIDE,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) return true;

    const hasDecisionPermission =
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_EDIT) ||
      hasPerm(user, Permissions.APPROVAL_REQUESTS_DECIDE);
    if (!hasDecisionPermission) return false;

    if (
      resource?.id &&
      user.employeeId &&
      String(resource.id) === String(user.employeeId) &&
      !hasPerm(user, Permissions.EMPLOYEES_MANAGE)
    ) {
      return false;
    }

    if (
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL)
    )
      return true;

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT)) {
      if (!resource) return false;
      return Boolean(
        resource.departmentId &&
        user.departmentId &&
        String(user.departmentId) === String(resource.departmentId) &&
        (!user.employeeId || String(resource.id) !== String(user.employeeId)),
      );
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)) {
      return false;
    }

    return true;
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
      hasPerm(user, Permissions.EMPLOYEES_VIEW_SENSITIVE) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE_SENSITIVE)
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
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return (
      hasPerm(user, Permissions.EMPLOYEES_CREATE) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE)
    );
  }
}

class EditEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "EditEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_UPDATE_ALL,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const hasEditPermission =
      hasPerm(user, Permissions.EMPLOYEES_EDIT) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE);
    if (!hasEditPermission) return false;

    if (
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE)
    ) {
      return true;
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT)) {
      if (!resource) return true;
      return Boolean(
        user.departmentId &&
        resource.departmentId &&
        String(user.departmentId) === String(resource.departmentId),
      );
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)) {
      if (!resource) return true;
      return Boolean(
        (resource.id && user.employeeId && String(resource.id) === String(user.employeeId)) ||
        (resource.userId && user.id && String(resource.userId) === String(user.id)),
      );
    }

    return true;
  }
}

class DeleteEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_DELETE,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const hasDeletePermission =
      hasPerm(user, Permissions.EMPLOYEES_DELETE) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE);
    if (!hasDeletePermission) return false;

    if (
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL)
    ) {
      return true;
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT)) {
      if (!resource) return true;
      return Boolean(
        user.departmentId &&
        resource.departmentId &&
        String(user.departmentId) === String(resource.departmentId),
      );
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)) {
      if (!resource) return true;
      return Boolean(
        (resource.id && user.employeeId && String(resource.id) === String(user.employeeId)) ||
        (resource.userId && user.id && String(resource.userId) === String(user.id)),
      );
    }

    return true;
  }
}

class ResetEmployeePasswordPolicyHandler implements PolicyHandler {
  readonly policyName = "ResetEmployeePassword";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_RESET_PASSWORD,
    Permissions.EMPLOYEES_MANAGE,
  ];
  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const hasResetPermission =
      hasPerm(user, Permissions.EMPLOYEES_RESET_PASSWORD) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE);
    if (!hasResetPermission) return false;

    if (
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL)
    ) {
      return true;
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT)) {
      if (!resource) return true;
      return Boolean(
        user.departmentId &&
        resource.departmentId &&
        String(user.departmentId) === String(resource.departmentId),
      );
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)) {
      if (!resource) return true;
      return Boolean(
        (resource.id && user.employeeId && String(resource.id) === String(user.employeeId)) ||
        (resource.userId && user.id && String(resource.userId) === String(user.id)),
      );
    }

    return true;
  }
}

class ManageEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "ManageEmployee";
  readonly requiredAnyOfPermissions = [Permissions.EMPLOYEES_MANAGE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return hasPerm(user, Permissions.EMPLOYEES_MANAGE);
  }
}

class TerminateEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "TerminateEmployee";
  readonly requiredAnyOfPermissions = [
    Permissions.EMPLOYEES_MANAGE,
    Permissions.EMPLOYEES_MANAGE_SENSITIVE,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin) return true;
    if (user.permissions?.includes(Permissions.SYS_ALL)) return true;
    const hasTerminatePermission =
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_MANAGE_SENSITIVE);
    if (!hasTerminatePermission) return false;

    if (
      hasPerm(user, Permissions.EMPLOYEES_MANAGE) ||
      hasPerm(user, Permissions.EMPLOYEES_UPDATE_ALL) ||
      hasPerm(user, Permissions.EMPLOYEES_VIEW_ALL)
    ) {
      return true;
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_DEPARTMENT)) {
      if (!resource) return true;
      return Boolean(
        user.departmentId &&
        resource.departmentId &&
        String(user.departmentId) === String(resource.departmentId),
      );
    }

    if (hasPerm(user, Permissions.EMPLOYEES_VIEW_SELF)) {
      if (!resource) return true;
      return Boolean(
        (resource.id && user.employeeId && String(resource.id) === String(user.employeeId)) ||
        (resource.userId && user.id && String(resource.userId) === String(user.id)),
      );
    }

    return true;
  }
}

class PurgeEmployeePolicyHandler implements PolicyHandler {
  readonly policyName = "PurgeEmployee";
  readonly requiredAnyOfPermissions = [];
  handle(user: AuthUser): boolean {
    return user.isSuperAdmin || user.permissions?.includes("sys:all");
  }
}

export const EmployeePolicies = {
  view: new ViewEmployeePolicyHandler(),
  viewAll: new ViewAllEmployeePolicyHandler(),
  approveTransfer: new ApproveTransferEmployeePolicyHandler(),
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
