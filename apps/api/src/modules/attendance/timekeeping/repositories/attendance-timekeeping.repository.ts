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

  // ─── Adjustment, Reconciliation, and Validator Repository Methods ─────────

  async findPeriodLock(period: string) {
    return this.db.query.attendancePeriodLocks.findFirst({
      where: eq(schema.attendancePeriodLocks.period, period),
    });
  }

  async findSnapshot(period: string, employeeId: string) {
    return this.db.query.timesheetSnapshots.findFirst({
      where: and(
        eq(schema.timesheetSnapshots.period, period),
        eq(schema.timesheetSnapshots.employeeId, employeeId),
      ),
    });
  }

  async insertAdjustment(values: typeof schema.attendanceAdjustments.$inferInsert, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.attendanceAdjustments)
      .values(values)
      .returning();
    return row ?? null;
  }

  async insertAdjustmentItems(values: Array<typeof schema.attendanceAdjustmentItems.$inferInsert>, tx?: PostgresJsDatabase<typeof schema>) {
    if (values.length === 0) return;
    const db = tx ?? this.db;
    await db.insert(schema.attendanceAdjustmentItems).values(values as any);
  }

  async updateAdjustment(id: string, patch: Partial<typeof schema.attendanceAdjustments.$inferInsert>, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [updated] = await db
      .update(schema.attendanceAdjustments)
      .set(patch as any)
      .where(eq(schema.attendanceAdjustments.id, id))
      .returning();
    return updated ?? null;
  }

  async findAdjustmentById(id: string) {
    return this.db.query.attendanceAdjustments.findFirst({
      where: eq(schema.attendanceAdjustments.id, id),
      with: { items: true },
    });
  }

  async listAdjustments(period?: string, employeeId?: string) {
    const conditions: SQL[] = [];
    if (period) conditions.push(eq(schema.attendanceAdjustments.period, period));
    if (employeeId) conditions.push(eq(schema.attendanceAdjustments.employeeId, employeeId));

    return this.db
      .select()
      .from(schema.attendanceAdjustments)
      .where(conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions));
  }

  async findAppliedAdjustmentsWithItems(period: string, employeeId: string) {
    return this.db.query.attendanceAdjustments.findMany({
      where: and(
        eq(schema.attendanceAdjustments.period, period),
        eq(schema.attendanceAdjustments.employeeId, employeeId),
        eq(schema.attendanceAdjustments.status, "applied"),
      ),
      with: { items: true },
    });
  }

  async insertPayrollReconciliationRun(values: typeof schema.attendancePayrollReconciliations.$inferInsert) {
    const [row] = await this.db
      .insert(schema.attendancePayrollReconciliations)
      .values(values)
      .returning();
    return row ?? null;
  }

  async updatePayrollReconciliationRun(id: string, patch: Partial<typeof schema.attendancePayrollReconciliations.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.attendancePayrollReconciliations)
      .set(patch as any)
      .where(eq(schema.attendancePayrollReconciliations.id, id))
      .returning();
    return updated ?? null;
  }

  async findTimesheetSnapshotsForPeriod(period: string) {
    return this.db
      .select()
      .from(schema.timesheetSnapshots)
      .where(eq(schema.timesheetSnapshots.period, period));
  }

  async findPayrollItemsForEmployees(employeeIds: string[]) {
    if (employeeIds.length === 0) return [];
    return this.db
      .select()
      .from(schema.payrollItems)
      .where(
        and(
          inArray(schema.payrollItems.employeeId, employeeIds),
          eq(schema.payrollItems.metadata, sql`'{"source": "attendance_summary"}'::jsonb`),
        ),
      );
  }

  async insertPayrollReconciliationItems(values: Array<typeof schema.attendancePayrollReconciliationItems.$inferInsert>) {
    if (values.length === 0) return;
    await this.db.insert(schema.attendancePayrollReconciliationItems).values(values as any);
  }

  async findPayrollReconciliation(id: string) {
    return this.db.query.attendancePayrollReconciliations.findFirst({
      where: eq(schema.attendancePayrollReconciliations.id, id),
    });
  }

  async listPayrollReconciliationItems(reconciliationId: string, diffType?: string) {
    const conditions: SQL[] = [
      eq(schema.attendancePayrollReconciliationItems.reconciliationId, reconciliationId),
    ];
    if (diffType) {
      conditions.push(eq(schema.attendancePayrollReconciliationItems.diffType, diffType as any));
    }

    return this.db
      .select()
      .from(schema.attendancePayrollReconciliationItems)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }

  async listPayrollReconciliations(period?: string) {
    const conditions: SQL[] = [];
    if (period) {
      conditions.push(eq(schema.attendancePayrollReconciliations.period, period));
    }

    return this.db
      .select()
      .from(schema.attendancePayrollReconciliations)
      .where(conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(sql`${schema.attendancePayrollReconciliations.checkedAt} DESC`);
  }

  async countPendingExceptionsInRange(from: string, to: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.attendanceExceptions)
      .where(
        and(
          eq(schema.attendanceExceptions.status, "pending"),
          gte(schema.attendanceExceptions.workDate, from),
          lte(schema.attendanceExceptions.workDate, to),
        ),
      );
    return Number(result?.value ?? 0);
  }

  async getAllPeriodLocks(): Promise<Array<{ period: string; status: string }>> {
    return this.db
      .select({ period: schema.attendancePeriodLocks.period, status: schema.attendancePeriodLocks.status })
      .from(schema.attendancePeriodLocks)
      .orderBy(schema.attendancePeriodLocks.period);
  }

  async countPendingAdjustments(period: string): Promise<number> {
    const result = await this.db
      .select({ value: count() })
      .from(schema.attendanceAdjustments)
      .where(
        and(
          eq(schema.attendanceAdjustments.period, period),
          eq(schema.attendanceAdjustments.status, "requested"),
        ),
      );
    return Number(result[0]?.value ?? 0);
  }

  async findLatestReconciliation(period: string) {
    const [row] = await this.db
      .select()
      .from(schema.attendancePayrollReconciliations)
      .where(eq(schema.attendancePayrollReconciliations.period, period))
      .orderBy(sql`${schema.attendancePayrollReconciliations.checkedAt} DESC`)
      .limit(1);
    return row ?? null;
  }

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

  async deleteClockEvents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.delete(schema.attendances).where(inArray(schema.attendances.id, ids));
  }

  async findEmployeeIdsWithSummariesInRange(from: string, to: string): Promise<string[]> {
    const employeeRows = await this.db
      .select({ employeeId: schema.attendanceDailySummaries.employeeId })
      .from(schema.attendanceDailySummaries)
      .where(
        and(
          sql`${schema.attendanceDailySummaries.workDate} >= ${from}`,
          sql`${schema.attendanceDailySummaries.workDate} <= ${to}`,
        ),
      )
      .groupBy(schema.attendanceDailySummaries.employeeId);

    return employeeRows.map((r) => r.employeeId).filter(Boolean) as string[];
  }

  async insertTimesheetSnapshots(
    values: Array<typeof schema.timesheetSnapshots.$inferInsert>,
  ): Promise<void> {
    if (values.length === 0) return;
    await this.db.insert(schema.timesheetSnapshots).values(values as any);
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

  async findWorkspaceData(query: { departmentId?: string; from: string; to: string }): Promise<{
    employees: Array<{
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string | null;
      departmentName: string | null;
    }>;
    summaries: Array<{
      employeeId: string;
      workDate: string;
      status: string | null;
      workedMinutes: number | null;
      scheduledMinutes: number | null;
      lateMinutes: number | null;
      earlyLeaveMinutes: number | null;
      overtimeMinutes: number | null;
      isHoliday: boolean;
    }>;
    events: Array<{
      employeeId: string;
      date: string;
      type: string;
      time: Date | null;
    }>;
  }> {
    const conditions: SQL[] = [];
    if (query.departmentId) {
      conditions.push(eq(schema.orgAssignments.departmentId, query.departmentId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const employeeRows = await this.db
      .select({
        id: schema.employees.id,
        employeeCode: schema.employees.employeeCode,
        firstName: schema.employees.firstName,
        lastName: schema.employees.lastName,
        departmentName: schema.departments.name,
      })
      .from(schema.employees)
      .leftJoin(schema.orgAssignments, eq(schema.orgAssignments.employeeId, schema.employees.id))
      .leftJoin(schema.departments, eq(schema.departments.id, schema.orgAssignments.departmentId))
      .where(whereClause)
      .orderBy(schema.employees.firstName);

    const employeeIds = employeeRows.map((r) => r.id);
    if (employeeIds.length === 0) {
      return { employees: [], summaries: [], events: [] };
    }

    const [summaryRows, eventRows] = await Promise.all([
      this.db
        .select({
          employeeId: schema.attendanceDailySummaries.employeeId,
          workDate: schema.attendanceDailySummaries.workDate,
          status: schema.attendanceDailySummaries.status,
          workedMinutes: schema.attendanceDailySummaries.workedMinutes,
          scheduledMinutes: schema.attendanceDailySummaries.scheduledMinutes,
          lateMinutes: schema.attendanceDailySummaries.lateMinutes,
          earlyLeaveMinutes: schema.attendanceDailySummaries.earlyLeaveMinutes,
          overtimeMinutes: schema.attendanceDailySummaries.overtimeMinutes,
          isHoliday: schema.attendanceDailySummaries.isHoliday,
        })
        .from(schema.attendanceDailySummaries)
        .where(inArray(schema.attendanceDailySummaries.employeeId, employeeIds) as any),
      this.db
        .select({
          employeeId: schema.attendances.employeeId,
          date: schema.attendances.date,
          type: schema.attendances.type,
          time: schema.attendances.time,
        })
        .from(schema.attendances)
        .where(inArray(schema.attendances.employeeId, employeeIds) as any),
    ]);

    return {
      employees: employeeRows,
      summaries: summaryRows,
      events: eventRows,
    };
  }
}

