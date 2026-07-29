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
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_TIMESHEET_VIEW,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return this.requiredAnyOfPermissions.some((p) => perms.includes(p));
  }
}

class AttendanceTimesheetManagePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetManage";
  readonly requiredAnyOfPermissions = [Permissions.ATTENDANCE_TIMESHEET_MANAGE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE) ?? false;
  }
}

class AttendancePeriodLockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodLock";
  readonly requiredAnyOfPermissions = [Permissions.ATTENDANCE_PERIOD_LOCK_MANAGE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_LOCK_MANAGE) ?? false;
  }
}

class AttendancePeriodUnlockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodUnlock";
  readonly requiredAnyOfPermissions = [Permissions.ATTENDANCE_PERIOD_UNLOCK_MANAGE];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_UNLOCK_MANAGE) ?? false;
  }
}

export const AttendancePolicies = {
  check: new CheckAttendancePolicyHandler(),
  view: new ViewAttendancePolicyHandler(),
  report: new AttendanceReportPolicyHandler(),
  timesheetView: new AttendanceTimesheetPolicyHandler(),
  timesheetManage: new AttendanceTimesheetManagePolicyHandler(),
  periodLock: new AttendancePeriodLockPolicyHandler(),
  periodUnlock: new AttendancePeriodUnlockPolicyHandler(),
};
