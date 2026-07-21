/**
 * WorkforcePolicy — covers Departments, Schedules, and Payroll.
 * Grouped here because they share workforce-management ownership.
 */
import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

// ─── Departments ─────────────────────────────────────────────────────────────

class ViewDepartmentPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewDepartment";
  readonly requiredAnyOfPermissions = [Permissions.DEPARTMENTS_VIEW];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.DEPARTMENTS_VIEW) ?? false;
  }
}
class CreateDepartmentPolicyHandler implements PolicyHandler {
  readonly policyName = "CreateDepartment";
  readonly requiredAnyOfPermissions = [Permissions.DEPARTMENTS_CREATE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.DEPARTMENTS_CREATE) ?? false;
  }
}
class EditDepartmentPolicyHandler implements PolicyHandler {
  readonly policyName = "EditDepartment";
  readonly requiredAnyOfPermissions = [Permissions.DEPARTMENTS_EDIT];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.DEPARTMENTS_EDIT) ?? false;
  }
}
class DeleteDepartmentPolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteDepartment";
  readonly requiredAnyOfPermissions = [Permissions.DEPARTMENTS_DELETE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.DEPARTMENTS_DELETE) ?? false;
  }
}

// ─── Schedules ───────────────────────────────────────────────────────────────

class ViewSchedulePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewSchedule";
  readonly requiredAnyOfPermissions = [
    Permissions.SCHEDULE_VIEW_ALL,
    Permissions.SCHEDULE_VIEW_DEPARTMENT,
    Permissions.SCHEDULE_VIEW_SELF,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    if (perms.includes(Permissions.SCHEDULE_VIEW_ALL)) return true;
    if (!resource) {
      return (
        perms.includes(Permissions.SCHEDULE_VIEW_ALL) ||
        perms.includes(Permissions.SCHEDULE_VIEW_DEPARTMENT)
      );
    }
    if (
      perms.includes(Permissions.SCHEDULE_VIEW_DEPARTMENT) &&
      resource.departmentId &&
      user.departmentId &&
      String(resource.departmentId) === String(user.departmentId)
    )
      return true;
    if (
      perms.includes(Permissions.SCHEDULE_VIEW_SELF) &&
      resource.employeeId &&
      user.employeeId &&
      String(resource.employeeId) === String(user.employeeId)
    )
      return true;
    return false;
  }
}

class EditSchedulePolicyHandler implements PolicyHandler {
  readonly policyName = "EditSchedule";
  readonly requiredAnyOfPermissions = [
    Permissions.SCHEDULE_EDIT_ALL,
    Permissions.SCHEDULE_EDIT_DEPARTMENT,
    Permissions.SCHEDULE_EDIT_SELF,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    if (perms.includes(Permissions.SCHEDULE_EDIT_ALL)) return true;
    if (!resource) return perms.includes(Permissions.SCHEDULE_EDIT_DEPARTMENT);
    if (
      perms.includes(Permissions.SCHEDULE_EDIT_DEPARTMENT) &&
      resource.departmentId &&
      user.departmentId &&
      String(resource.departmentId) === String(user.departmentId)
    )
      return true;
    if (
      perms.includes(Permissions.SCHEDULE_EDIT_SELF) &&
      resource.employeeId &&
      user.employeeId &&
      String(resource.employeeId) === String(user.employeeId)
    )
      return true;
    return false;
  }
}

class CopySchedulePolicyHandler implements PolicyHandler {
  readonly policyName = "CopySchedule";
  readonly requiredAnyOfPermissions = [Permissions.SCHEDULE_COPY];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.SCHEDULE_COPY) ?? false;
  }
}

class CreateSchedulePolicyHandler implements PolicyHandler {
  readonly policyName = "CreateSchedule";
  readonly requiredAnyOfPermissions = [
    Permissions.SCHEDULE_CREATE,
    Permissions.SCHEDULE_EDIT_ALL,
    Permissions.SCHEDULE_EDIT_DEPARTMENT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.SCHEDULE_CREATE) ||
      perms.includes(Permissions.SCHEDULE_EDIT_ALL) ||
      perms.includes(Permissions.SCHEDULE_EDIT_DEPARTMENT)
    );
  }
}

class DeleteSchedulePolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteSchedule";
  readonly requiredAnyOfPermissions = [
    Permissions.SCHEDULE_DELETE,
    Permissions.SCHEDULE_EDIT_ALL,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.SCHEDULE_DELETE) ||
      perms.includes(Permissions.SCHEDULE_EDIT_ALL)
    );
  }
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

class ViewPayrollPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewPayroll";
  readonly requiredAnyOfPermissions = [
    Permissions.PAYROLL_VIEW_SELF,
    Permissions.PAYROLL_VIEW_ALL,
    Permissions.PAYROLL_MANAGE,
  ];
  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    if (
      perms.includes(Permissions.PAYROLL_VIEW_ALL) ||
      perms.includes(Permissions.PAYROLL_MANAGE)
    )
      return true;
    if (!resource) return false;
    const employeeId = resource.id ?? resource.employeeId;
    return (
      perms.includes(Permissions.PAYROLL_VIEW_SELF) &&
      employeeId &&
      user.employeeId &&
      String(employeeId) === String(user.employeeId)
    );
  }
}

class ViewAllPayrollPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAllPayroll";
  readonly requiredAnyOfPermissions = [
    Permissions.PAYROLL_VIEW,
    Permissions.PAYROLL_VIEW_ALL,
    Permissions.PAYROLL_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.PAYROLL_VIEW) ||
      perms.includes(Permissions.PAYROLL_VIEW_ALL) ||
      perms.includes(Permissions.PAYROLL_MANAGE)
    );
  }
}

class EditPayrollPolicyHandler implements PolicyHandler {
  readonly policyName = "EditPayroll";
  readonly requiredAnyOfPermissions = [
    Permissions.PAYROLL_EDIT,
    Permissions.PAYROLL_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.PAYROLL_EDIT) ||
      perms.includes(Permissions.PAYROLL_MANAGE)
    );
  }
}

class ManagePayrollPeriodsPolicyHandler implements PolicyHandler {
  readonly policyName = "ManagePayrollPeriods";
  readonly requiredAnyOfPermissions = [Permissions.PAYROLL_MANAGE_PERIODS];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.PAYROLL_MANAGE_PERIODS) ?? false;
  }
}

class ManagePayslipsPolicyHandler implements PolicyHandler {
  readonly policyName = "ManagePayslips";
  readonly requiredAnyOfPermissions = [Permissions.PAYROLL_MANAGE_PAYSLIPS];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.PAYROLL_MANAGE_PAYSLIPS) ?? false;
  }
}

export const DepartmentPolicies = {
  view: new ViewDepartmentPolicyHandler(),
  create: new CreateDepartmentPolicyHandler(),
  edit: new EditDepartmentPolicyHandler(),
  delete: new DeleteDepartmentPolicyHandler(),
};

export const SchedulePolicies = {
  view: new ViewSchedulePolicyHandler(),
  edit: new EditSchedulePolicyHandler(),
  update: new EditSchedulePolicyHandler(),
  create: new CreateSchedulePolicyHandler(),
  delete: new DeleteSchedulePolicyHandler(),
  copy: new CopySchedulePolicyHandler(),
};

export const PayrollPolicies = {
  view: new ViewPayrollPolicyHandler(),
  viewAll: new ViewAllPayrollPolicyHandler(),
  update: new EditPayrollPolicyHandler(),
  managePeriods: new ManagePayrollPeriodsPolicyHandler(),
  managePayslips: new ManagePayslipsPolicyHandler(),
};
