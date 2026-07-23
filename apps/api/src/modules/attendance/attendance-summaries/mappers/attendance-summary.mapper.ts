import type { AttendanceSummaryWithOverride } from "../read-model/attendance-summary-read.service";

export class AttendanceSummaryMapper {
  static toDto(row: AttendanceSummaryWithOverride) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeShiftAssignmentId: row.employeeShiftAssignmentId ?? null,
      leaveRequestId: row.leaveRequestId ?? null,
      workDate: row.workDate,
      status: row.resolvedStatus,
      scheduledMinutes: row.scheduledMinutes,
      workedMinutes: row.resolvedWorkedMinutes,
      breakMinutes: row.breakMinutes,
      lateMinutes: row.resolvedLateMinutes,
      earlyLeaveMinutes: row.resolvedEarlyLeaveMinutes,
      overtimeMinutes: row.resolvedOvertimeMinutes,
      isHoliday: row.isHoliday,
      anomalyFlags: row.anomalyFlags ?? null,
      sourceData: row.sourceData ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      hasOverride: row.hasOverride,
      override: row.hasOverride
        ? {
            status: row.overrideStatus,
            workedMinutes: row.overrideWorkedMinutes,
            lateMinutes: row.overrideLateMinutes,
            earlyLeaveMinutes: row.overrideEarlyLeaveMinutes,
            overtimeMinutes: row.overrideOvertimeMinutes,
            reason: row.overrideReason,
            note: row.overrideNote,
          }
        : undefined,
      employee: row.employee
        ? {
            id: row.employee.id,
            employeeCode: row.employee.employeeCode,
            fullName:
              `${row.employee.firstName} ${row.employee.lastName}`.trim(),
            departmentName: row.employee.departmentName ?? null,
          }
        : undefined,
    };
  }
}

