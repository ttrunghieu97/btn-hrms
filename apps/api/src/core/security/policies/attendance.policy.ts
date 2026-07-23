import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

class CheckAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "CheckAttendance";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
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
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
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
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_REPORT) ?? false;
  }
}

export const AttendancePolicies = {
  check: new CheckAttendancePolicyHandler(),
  view: new ViewAttendancePolicyHandler(),
  report: new AttendanceReportPolicyHandler(),
};
