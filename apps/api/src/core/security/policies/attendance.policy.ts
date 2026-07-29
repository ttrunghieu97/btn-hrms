import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

class CheckAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "CheckAttendance";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    if (user.permissions?.includes(Permissions.ATTENDANCE_CHECK)) return true;
    return Boolean(user.employeeId); // Any employee can check themselves
  }
}

class ViewAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAttendance";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_VIEW_DEPARTMENT,
    Permissions.ATTENDANCE_VIEW_SELF,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];

    if (perms.includes(Permissions.ATTENDANCE_VIEW_ALL)) return true;

    // List endpoints (no resource): need department or all
    if (!resource) {
      return (
        perms.includes(Permissions.ATTENDANCE_VIEW_ALL) ||
        perms.includes(Permissions.ATTENDANCE_VIEW_DEPARTMENT)
      );
    }

    // ABAC: department-scoped
    if (
      perms.includes(Permissions.ATTENDANCE_VIEW_DEPARTMENT) &&
      resource.departmentId &&
      user.departmentId &&
      String(resource.departmentId) === String(user.departmentId)
    )
      return true;

    // ABAC: self-scoped
    if (
      perms.includes(Permissions.ATTENDANCE_VIEW_SELF) &&
      resource.employeeId &&
      user.employeeId &&
      String(resource.employeeId) === String(user.employeeId)
    )
      return true;

    return false;
  }
}

class AttendanceReportPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceReport";
  readonly requiredAnyOfPermissions = [Permissions.ATTENDANCE_REPORT];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_REPORT) ?? false;
  }
}

class AttendanceTimesheetPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheet";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return (user.permissions ?? []).some((p) =>
      [Permissions.ATTENDANCE_TIMESHEET_VIEW, Permissions.ATTENDANCE_TIMESHEET_MANAGE].includes(p as any)
    );
  }
}

class AttendanceTimesheetManagePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetManage";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE) ?? false;
  }
}

class AttendanceTimesheetApprovePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetApprove";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_TIMESHEET_APPROVE) ?? false;
  }
}

class AttendanceTimesheetImportPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetImport";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_TIMESHEET_IMPORT) ?? false;
  }
}

class AttendancePeriodViewPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodView";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_VIEW) ?? false;
  }
}

class AttendancePeriodLockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodLock";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_LOCK) ?? false;
  }
}

class AttendancePeriodUnlockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodUnlock";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_UNLOCK) ?? false;
  }
}

class AttendancePeriodClosePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodClose";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_CLOSE) ?? false;
  }
}

export const AttendancePolicies = {
  check: new CheckAttendancePolicyHandler(),
  view: new ViewAttendancePolicyHandler(),
  report: new AttendanceReportPolicyHandler(),
  timesheetView: new AttendanceTimesheetPolicyHandler(),
  timesheetManage: new AttendanceTimesheetManagePolicyHandler(),
  timesheetApprove: new AttendanceTimesheetApprovePolicyHandler(),
  timesheetImport: new AttendanceTimesheetImportPolicyHandler(),
  periodView: new AttendancePeriodViewPolicyHandler(),
  periodLock: new AttendancePeriodLockPolicyHandler(),
  periodUnlock: new AttendancePeriodUnlockPolicyHandler(),
  periodClose: new AttendancePeriodClosePolicyHandler(),
};
