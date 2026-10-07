import type * as schema from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { ShiftAssignmentRecord } from "../../../../contracts/ports/employee-shift-reader.port";

export type TimekeepingExceptionType =
  | "missing_punch"
  | "invalid_sequence"
  | "off_shift";

type ClockEventRow = typeof schema.attendances.$inferSelect;
type ExceptionRow = typeof schema.attendanceExceptions.$inferSelect;
type SummaryRow = typeof schema.attendanceDailySummaries.$inferSelect;

export interface IAttendanceTimekeepingRepository {
  createClockEvent(
    values: typeof schema.attendances.$inferInsert,
    tx?: AppDatabase,
  ): Promise<ClockEventRow | null>;
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
    tx?: AppDatabase,
  ): Promise<ClockEventRow[]>;
  findShiftAssignmentForEmployeeDay(
    employeeId: string,
    workDate: string,
    tx?: AppDatabase,
  ): Promise<ShiftAssignmentRecord | null>;
  upsertAttendanceSummary(
    employeeId: string,
    workDate: string,
    values: Partial<typeof schema.attendanceDailySummaries.$inferInsert>,
    tx?: AppDatabase,
  ): Promise<SummaryRow | null>;
  replaceExceptionsForEmployeeDay(
    employeeId: string,
    workDate: string,
    summaryId: string,
    exceptionTypes: TimekeepingExceptionType[],
    relatedEventIds: string[],
    tx?: AppDatabase,
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
    tx?: AppDatabase,
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



