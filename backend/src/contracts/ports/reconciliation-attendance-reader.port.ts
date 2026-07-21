import type * as schema from "../../infrastructure/database/schema";

export const RECONCILIATION_ATTENDANCE_READER_PORT = "RECONCILIATION_ATTENDANCE_READER_PORT";

export type AttendanceSessionRow = typeof schema.attendanceSessions.$inferSelect;
export type ClockEventRow = typeof schema.attendances.$inferSelect;

export interface ReconciliationAttendanceReaderPort {
  findSessionsByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<AttendanceSessionRow[]>;

  findClockEventsByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<ClockEventRow[]>;
}
