import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

class CheckAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "CheckAttendance";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_CHECK,
    Permissions.GPS_LOGS_SUBMIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    if (
      perms.includes(Permissions.ATTENDANCE_CHECK) ||
      perms.includes(Permissions.GPS_LOGS_SUBMIT)
    ) {
      return true;
    }
    return Boolean(user.employeeId); // Any employee can check themselves
  }
}

class ViewAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAttendance";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_VIEW_DEPARTMENT,
    Permissions.ATTENDANCE_VIEW_SELF,
    Permissions.ATTENDANCE_REPORT,
    Permissions.GPS_LOGS_VIEW,
    Permissions.DASHBOARD_VIEW,
  ];

  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];

    if (
      perms.includes(Permissions.ATTENDANCE_VIEW_ALL) ||
      perms.includes(Permissions.ATTENDANCE_REPORT)
    ) {
      return true;
    }

    // List endpoints (no resource): allow self, department, all, gps-logs:view, or dashboard:view
    // Data scoping is enforced via QueryScopeService in the use-cases/repositories.
    if (!resource) {
      return (
        perms.includes(Permissions.ATTENDANCE_VIEW_ALL) ||
        perms.includes(Permissions.ATTENDANCE_VIEW_DEPARTMENT) ||
        perms.includes(Permissions.ATTENDANCE_VIEW_SELF) ||
        perms.includes(Permissions.GPS_LOGS_VIEW) ||
        perms.includes(Permissions.DASHBOARD_VIEW)
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
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_REPORT,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
    Permissions.ATTENDANCE_VIEW_ALL,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_REPORT) ||
      perms.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE) ||
      perms.includes(Permissions.ATTENDANCE_VIEW_ALL)
    );
  }
}

class AttendanceTimesheetPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheet";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_TIMESHEET_VIEW,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
    Permissions.ATTENDANCE_TIMESHEET_APPROVE,
    Permissions.ATTENDANCE_REPORT,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_VIEW_DEPARTMENT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return perms.some((p) =>
      [
        Permissions.ATTENDANCE_TIMESHEET_VIEW,
        Permissions.ATTENDANCE_TIMESHEET_MANAGE,
        Permissions.ATTENDANCE_TIMESHEET_APPROVE,
        Permissions.ATTENDANCE_REPORT,
        Permissions.ATTENDANCE_VIEW_ALL,
        Permissions.ATTENDANCE_VIEW_DEPARTMENT,
      ].includes(p as any)
    );
  }
}

class AttendanceTimesheetManagePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetManage";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
    Permissions.ATTENDANCE_REPORT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE) ||
      perms.includes(Permissions.ATTENDANCE_REPORT)
    );
  }
}

class AttendanceTimesheetApprovePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetApprove";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_TIMESHEET_APPROVE,
    Permissions.ATTENDANCE_PERIOD_APPROVE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_TIMESHEET_APPROVE) ||
      perms.includes(Permissions.ATTENDANCE_PERIOD_APPROVE)
    );
  }
}

class AttendanceTimesheetImportPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetImport";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_TIMESHEET_IMPORT,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_TIMESHEET_IMPORT) ||
      perms.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE)
    );
  }
}

class AttendancePeriodViewPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodView";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_VIEW,
    Permissions.ATTENDANCE_PERIOD_REVIEW,
    Permissions.ATTENDANCE_PERIOD_APPROVE,
    Permissions.ATTENDANCE_PERIOD_LOCK,
    Permissions.ATTENDANCE_PERIOD_UNLOCK,
    Permissions.ATTENDANCE_PERIOD_CLOSE,
    Permissions.ATTENDANCE_TIMESHEET_VIEW,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
    Permissions.ATTENDANCE_REPORT,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.ATTENDANCE_VIEW_DEPARTMENT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return perms.some((p) =>
      [
        Permissions.ATTENDANCE_PERIOD_VIEW,
        Permissions.ATTENDANCE_PERIOD_REVIEW,
        Permissions.ATTENDANCE_PERIOD_APPROVE,
        Permissions.ATTENDANCE_PERIOD_LOCK,
        Permissions.ATTENDANCE_PERIOD_UNLOCK,
        Permissions.ATTENDANCE_PERIOD_CLOSE,
        Permissions.ATTENDANCE_TIMESHEET_VIEW,
        Permissions.ATTENDANCE_TIMESHEET_MANAGE,
        Permissions.ATTENDANCE_REPORT,
        Permissions.ATTENDANCE_VIEW_ALL,
        Permissions.ATTENDANCE_VIEW_DEPARTMENT,
      ].includes(p as any)
    );
  }
}

class AttendancePeriodReviewPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodReview";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_REVIEW,
    Permissions.ATTENDANCE_PERIOD_APPROVE,
    Permissions.ATTENDANCE_PERIOD_LOCK,
    Permissions.ATTENDANCE_TIMESHEET_MANAGE,
    Permissions.ATTENDANCE_REPORT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return perms.some((p) =>
      [
        Permissions.ATTENDANCE_PERIOD_REVIEW,
        Permissions.ATTENDANCE_PERIOD_APPROVE,
        Permissions.ATTENDANCE_PERIOD_LOCK,
        Permissions.ATTENDANCE_TIMESHEET_MANAGE,
        Permissions.ATTENDANCE_REPORT,
      ].includes(p as any)
    );
  }
}

class AttendancePeriodApprovePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodApprove";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_APPROVE,
    Permissions.ATTENDANCE_PERIOD_LOCK,
    Permissions.ATTENDANCE_TIMESHEET_APPROVE,
    Permissions.ATTENDANCE_REPORT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return perms.some((p) =>
      [
        Permissions.ATTENDANCE_PERIOD_APPROVE,
        Permissions.ATTENDANCE_PERIOD_LOCK,
        Permissions.ATTENDANCE_TIMESHEET_APPROVE,
        Permissions.ATTENDANCE_REPORT,
      ].includes(p as any)
    );
  }
}

class AttendancePeriodLockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodLock";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_LOCK,
    Permissions.ATTENDANCE_PERIOD_APPROVE,
    Permissions.ATTENDANCE_REPORT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return perms.some((p) =>
      [
        Permissions.ATTENDANCE_PERIOD_LOCK,
        Permissions.ATTENDANCE_PERIOD_APPROVE,
        Permissions.ATTENDANCE_REPORT,
      ].includes(p as any)
    );
  }
}

class AttendancePeriodUnlockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodUnlock";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_UNLOCK,
    Permissions.ATTENDANCE_PERIOD_CLOSE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_PERIOD_UNLOCK) ||
      perms.includes(Permissions.ATTENDANCE_PERIOD_CLOSE)
    );
  }
}

class AttendancePeriodClosePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodClose";
  readonly requiredAnyOfPermissions = [
    Permissions.ATTENDANCE_PERIOD_CLOSE,
    Permissions.ATTENDANCE_REPORT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permissions.ATTENDANCE_PERIOD_CLOSE) ||
      perms.includes(Permissions.ATTENDANCE_REPORT)
    );
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
  periodReview: new AttendancePeriodReviewPolicyHandler(),
  periodApprove: new AttendancePeriodApprovePolicyHandler(),
  periodLock: new AttendancePeriodLockPolicyHandler(),
  periodUnlock: new AttendancePeriodUnlockPolicyHandler(),
  periodClose: new AttendancePeriodClosePolicyHandler(),
};
