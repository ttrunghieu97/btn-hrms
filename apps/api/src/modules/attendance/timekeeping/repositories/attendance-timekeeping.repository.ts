import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  or,
  sql,
  SQL,
} from "drizzle-orm";
import {
  type EmployeeShiftReaderPort,
  EMPLOYEE_SHIFT_READER_PORT,
} from "../../../../contracts/ports/employee-shift-reader.port";
import {
  IAttendanceTimekeepingRepository,
  TimekeepingExceptionType,
} from "./attendance-timekeeping.repository.contract";

@Injectable()
export class AttendanceTimekeepingRepository
  implements IAttendanceTimekeepingRepository
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(EMPLOYEE_SHIFT_READER_PORT)
    private readonly shiftReader: EmployeeShiftReaderPort,
  ) {}

  async transaction<T>(fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async createClockEvent(values: typeof schema.attendances.$inferInsert): Promise<typeof schema.attendances.$inferSelect | null> {
    const [row] = await this.db
      .insert(schema.attendances)
      .values(values)
      .returning();
    return row ?? null;
  }

  async listClockEvents(query: {
    employeeId?: string;
    from?: string;
    to?: string;
    source?: "mobile" | "web" | "api" | "manual";
    page?: number;
    limit?: number;
  }): Promise<{
    rows: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, employeeId, from, to, source } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (employeeId) conditions.push(eq(schema.attendances.employeeId, employeeId));
    if (from) conditions.push(gte(schema.attendances.date, from));
    if (to) conditions.push(lte(schema.attendances.date, to));
    if (source) conditions.push(eq(schema.attendances.source, source));
    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await this.db.query.attendances.findMany({
      where,
      with: {
        employee: { with: { department: true } },
      },
      orderBy: [desc(schema.attendances.time)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.attendances)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  findClockEventsByEmployeeDay(
    employeeId: string,
    workDate: string,
  ) {
    return this.db.query.attendances.findMany({
      where: and(
        eq(schema.attendances.employeeId, employeeId),
        eq(schema.attendances.date, workDate),
      ),
      orderBy: [schema.attendances.time],
    });
  }

  async findShiftAssignmentForEmployeeDay(
    employeeId: string,
    workDate: string,
  ) {
    return this.shiftReader.findShiftAssignmentForEmployeeDay(
      employeeId,
      workDate,
    );
  }

  async upsertAttendanceSummary(
    employeeId: string,
    workDate: string,
    values: Partial<typeof schema.attendanceDailySummaries.$inferInsert>,
  ) {
    const existing = await this.db.query.attendanceDailySummaries.findFirst({
      where: and(
        eq(schema.attendanceDailySummaries.employeeId, employeeId),
        eq(schema.attendanceDailySummaries.workDate, workDate),
      ),
    });

    if (existing) {
      const [updated] = await this.db
        .update(schema.attendanceDailySummaries)
        .set({ ...(values), updatedAt: new Date() })
        .where(eq(schema.attendanceDailySummaries.id, existing.id))
        .returning();
      return updated ?? null;
    }

    const [created] = await this.db
      .insert(schema.attendanceDailySummaries)
      .values({ employeeId, workDate, ...(values) })
      .returning();

    return created ?? null;
  }

  async replaceExceptionsForEmployeeDay(
    employeeId: string,
    workDate: string,
    summaryId: string,
    exceptionTypes: TimekeepingExceptionType[],
    relatedEventIds: string[],
  ) {
    await this.db
      .delete(schema.attendanceExceptions)
      .where(
        and(
          eq(schema.attendanceExceptions.employeeId, employeeId),
          eq(schema.attendanceExceptions.workDate, workDate),
          eq(schema.attendanceExceptions.status, "pending"),
        ),
      );

    if (exceptionTypes.length === 0) {
      return [];
    }

    const values = exceptionTypes.map((type) => ({
      employeeId,
      attendanceDailySummaryId: summaryId,
      workDate,
      type,
      status: "pending" as const,
      relatedEventIds,
    })) as any ?? null;

    const rows = await this.db
      .insert(schema.attendanceExceptions)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schema.attendanceExceptions.employeeId,
          schema.attendanceExceptions.workDate,
          schema.attendanceExceptions.type,
        ],
        set: {
          attendanceDailySummaryId: summaryId,
          status: "pending",
          relatedEventIds,
          updatedAt: new Date(),
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
        },
      })
      .returning();

    return rows;
  }

  async listExceptions(query: {
    employeeId?: string;
    departmentId?: string;
    from?: string;
    to?: string;
    status?: "pending" | "resolved" | "closed";
    page?: number;
    limit?: number;
  }) {
    const {
      employeeId,
      departmentId,
      from,
      to,
      status,
      page = 1,
      limit = 20,
    } = query;

    const offset = (page - 1) * limit;

    let scopedEmployeeIds: string[] | null = null;
    if (departmentId) {
      const employees = await this.db.query.employees.findMany({
        where: eq(schema.employees.departmentId, departmentId),
        columns: { id: true },
      });
      scopedEmployeeIds = employees.map((item) => item.id);
      if (scopedEmployeeIds.length === 0) {
        return { rows: [], total: 0, page, limit };
      }
    }

    const conditions: SQL[] = [];
    if (employeeId)
      conditions.push(eq(schema.attendanceExceptions.employeeId, employeeId));
    if (status) conditions.push(eq(schema.attendanceExceptions.status, status));
    if (from) conditions.push(gte(schema.attendanceExceptions.workDate, from));
    if (to) conditions.push(lte(schema.attendanceExceptions.workDate, to));
    if (scopedEmployeeIds) {
      conditions.push(
        inArray(schema.attendanceExceptions.employeeId, scopedEmployeeIds),
      );
    }

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await this.db.query.attendanceExceptions.findMany({
      where,
      with: {
        employee: { with: { department: true } },
        attendanceSummary: true,
        resolvedByUser: {
          columns: { id: true, username: true, email: true },
        },
      },
      orderBy: [
        desc(schema.attendanceExceptions.workDate),
        desc(schema.attendanceExceptions.createdAt),
      ],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.attendanceExceptions)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  async getExceptionById(id: string) {
    return this.db.query.attendanceExceptions.findFirst({
      where: eq(schema.attendanceExceptions.id, id),
    }) as any ?? null;
  }

  async resolveException(
    id: string,
    values: {
      status: "resolved" | "closed";
      resolutionNote?: string;
      resolvedByUserId: string;
      resolvedAt: Date;
    },
  ) {
    const [updated] = await this.db
      .update(schema.attendanceExceptions)
      .set({
        status: values.status,
        resolutionNote: values.resolutionNote,
        resolvedByUserId: values.resolvedByUserId,
        resolvedAt: values.resolvedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.attendanceExceptions.id, id))
      .returning();
    return updated ?? null;
  }

  async listTimesheetSummaries(query: {
    employeeId?: string;
    departmentId?: string;
    from: string;
    to: string;
    page?: number;
    limit?: number;
  }): Promise<{
    rows: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { employeeId, departmentId, from, to, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    let scopedEmployeeIds: string[] | null = null;
    if (departmentId) {
      const employees = await this.db.query.employees.findMany({
        where: eq(schema.employees.departmentId, departmentId),
        columns: { id: true },
      });
      scopedEmployeeIds = employees.map((item) => item.id);
      if (scopedEmployeeIds.length === 0) {
        return { rows: [], total: 0, page, limit };
      }
    }

    const conditions: SQL[] = [
      gte(schema.attendanceDailySummaries.workDate, from),
      lte(schema.attendanceDailySummaries.workDate, to),
    ];
    if (employeeId) {
      conditions.push(eq(schema.attendanceDailySummaries.employeeId, employeeId));
    }
    if (scopedEmployeeIds) {
      conditions.push(
        inArray(schema.attendanceDailySummaries.employeeId, scopedEmployeeIds),
      );
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await this.db.query.attendanceDailySummaries.findMany({
      where,
      with: {
        employee: { with: { department: true } },
        exceptions: true,
      },
      orderBy: [desc(schema.attendanceDailySummaries.workDate)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.attendanceDailySummaries)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  async employeeExists(employeeId: string): Promise<boolean> {
    const row = await this.db.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
      columns: { id: true },
    });
    return !!row;
  }

  async findOverride(employeeId: string, workDate: string) {
    return this.db.query.attendanceSummaryOverrides.findFirst({
      where: and(
        eq(schema.attendanceSummaryOverrides.employeeId, employeeId),
        eq(schema.attendanceSummaryOverrides.workDate, workDate),
      ),
    });
  }

  async updateOverride(id: string, values: Record<string, unknown>) {
    const [updated] = await this.db
      .update(schema.attendanceSummaryOverrides)
      .set(values as any)
      .where(eq(schema.attendanceSummaryOverrides.id, id))
      .returning();
    return updated;
  }

  async insertOverride(values: Record<string, unknown>) {
    const [created] = await this.db
      .insert(schema.attendanceSummaryOverrides)
      .values(values as any)
      .returning();
    return created;
  }
}
