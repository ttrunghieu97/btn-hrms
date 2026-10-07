export const ATTENDANCE_SUMMARIES_READER = "ATTENDANCE_SUMMARIES_READER";

/**
 * Base attendance summary (without override resolution).
 *
 * This is NOT resolved Attendance Truth. Consumers needing resolved values
 * (overrides + exceptions applied) must use AttendanceReadPort instead.
 *
 * @see AttendanceReadPort.getEffectiveDailySummaries
 */
export interface AttendanceSummaryRecord {
  employeeId: string;
  workDate: string;
  status: string;
  workedMinutes: number | null;
  sourceData: unknown;
}

export interface IAttendanceSummariesReader {
  findByEmployeeAndDate(employeeId: string, date: string): Promise<AttendanceSummaryRecord | null>;
  findByEmployeeAndDates(employeeId: string, workDates: string[]): Promise<AttendanceSummaryRecord[]>;
  findByLeaveRequestId(leaveRequestId: string): Promise<AttendanceSummaryRecord[]>;
}
