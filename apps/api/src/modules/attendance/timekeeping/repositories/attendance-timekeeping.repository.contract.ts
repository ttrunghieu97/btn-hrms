import type * as schema from "../../../../infrastructure/database/schema";
import type { ShiftAssignmentRecord } from "../../../../contracts/ports/employee-shift-reader.port";

export type TimekeepingExceptionType =
  | "missing_punch"
  | "invalid_sequence"
  | "off_shift";

type ClockEventRow = typeof schema.attendances.$inferSelect;
type ExceptionRow = typeof schema.attendanceExceptions.$inferSelect;
type SummaryRow = typeof schema.attendanceDailySummaries.$inferSelect;

export interface IAttendanceTimekeepingRepository {
  createClockEvent(values: typeof schema.attendances.$inferInsert): Promise<ClockEventRow | null>;
  listClockEvents(query: {
    employeeId?: string;
    from?: string;
    to?: string;
    source?: "mobile" | "web" | "api" | "manual";
    page?: number;
    limit?: number;
  }): Promise<{ rows: unknown[]; total: number; page: number; limit: number }>;
  findClockEventsByEmployeeDay(
    employeeId: string,
    workDate: string,
  ): Promise<ClockEventRow[]>;
  findShiftAssignmentForEmployeeDay(
    employeeId: string,
    workDate: string,
  ): Promise<ShiftAssignmentRecord | null>;
  upsertAttendanceSummary(
    employeeId: string,
    workDate: string,
    values: Partial<typeof schema.attendanceDailySummaries.$inferInsert>,
  ): Promise<SummaryRow | null>;
  replaceExceptionsForEmployeeDay(
    employeeId: string,
    workDate: string,
    summaryId: string,
    exceptionTypes: TimekeepingExceptionType[],
    relatedEventIds: string[],
  ): Promise<ExceptionRow[]>;
  listExceptions(query: {
    employeeId?: string;
    departmentId?: string;
    from?: string;
    to?: string;
    status?: "pending" | "resolved" | "closed";
    page?: number;
    limit?: number;
  }): Promise<{ rows: ExceptionRow[]; total: number; page: number; limit: number }>;
  getExceptionById(id: string): Promise<ExceptionRow | null>;
  resolveException(
    id: string,
    values: {
      status: "resolved" | "closed";
      resolutionNote?: string;
      resolvedByUserId: string;
      resolvedAt: Date;
    },
  ): Promise<ExceptionRow | null>;
  listTimesheetSummaries(query: {
    employeeId?: string;
    departmentId?: string;
    from: string;
    to: string;
    page?: number;
    limit?: number;
  }): Promise<{ rows: unknown[]; total: number; page: number; limit: number }>;
}



