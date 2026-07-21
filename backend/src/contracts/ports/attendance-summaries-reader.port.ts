export const ATTENDANCE_SUMMARIES_READER = "ATTENDANCE_SUMMARIES_READER";

export interface IAttendanceSummariesReader {
  findByEmployeeAndDate(employeeId: string, date: string): Promise<unknown>;
  findByEmployeeAndDates(employeeId: string, workDates: string[]): Promise<unknown[]>;
  findByLeaveRequestId(leaveRequestId: string): Promise<unknown[]>;
}
