import { Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, and, gte, lt, eq, isNull, lte } from "drizzle-orm";
import { ScopedDbService } from "../../../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../../../infrastructure/database/schema";

export interface TodayAttendanceSummary {
  totalCheckIns: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onTimeCount: number;
}

export interface ExceptionSummary {
  type: string;
  count: number;
  pending: number;
  resolved: number;
}

export interface OvertimeSummary {
  approvedMinutes: number;
  pendingMinutes: number;
  employeeCount: number;
}

@Injectable()
export class AttendanceAggregateService {
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getTodaySummary(todayStr: string): Promise<TodayAttendanceSummary> {
    const [checkInRow] = await this.db
      .select({
        totalCheckIns: sql<number>`count(distinct ${schema.attendances.employeeId})::int`,
      })
      .from(schema.attendances)
      .where(eq(schema.attendances.date, todayStr));

    const [summaryRow] = await this.db
      .select({
        presentCount: sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} = 'present' THEN 1 END)::int`,
        absentCount: sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} = 'absent' THEN 1 END)::int`,
        lateCount: sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.lateMinutes} > 0 THEN 1 END)::int`,
        onTimeCount: sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.lateMinutes} = 0 AND ${schema.attendanceDailySummaries.status} = 'present' THEN 1 END)::int`,
      })
      .from(schema.attendanceDailySummaries)
      .where(eq(schema.attendanceDailySummaries.workDate, todayStr));

    return {
      totalCheckIns: checkInRow?.totalCheckIns ?? 0,
      presentCount: summaryRow?.presentCount ?? 0,
      absentCount: summaryRow?.absentCount ?? 0,
      lateCount: summaryRow?.lateCount ?? 0,
      onTimeCount: summaryRow?.onTimeCount ?? 0,
    };
  }

  async getExceptionSummary(
    from: string,
    to: string,
  ): Promise<ExceptionSummary[]> {
    return this.db
      .select({
        type: schema.attendanceExceptions.type,
        count: sql<number>`count(*)::int`,
        pending: sql<number>`count(CASE WHEN ${schema.attendanceExceptions.status} = 'pending' THEN 1 END)::int`,
        resolved: sql<number>`count(CASE WHEN ${schema.attendanceExceptions.status} = 'resolved' THEN 1 END)::int`,
      })
      .from(schema.attendanceExceptions)
      .where(
        and(
          gte(schema.attendanceExceptions.workDate, from),
          lte(schema.attendanceExceptions.workDate, to),
        ),
      )
      .groupBy(schema.attendanceExceptions.type)
      .orderBy(schema.attendanceExceptions.type);
  }

  async getOvertimeSummary(
    year: number,
    month: number,
  ): Promise<OvertimeSummary> {
    const mm = String(month).padStart(2, "0");
    const from = `${year}-${mm}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const [row] = await this.db
      .select({
        approvedMinutes:
          sql<number>`coalesce(sum(${schema.attendanceOvertimeRequests.approvedMinutes}), 0)::int`,
        pendingMinutes:
          sql<number>`coalesce(sum(CASE WHEN ${schema.attendanceOvertimeRequests.status} = 'pending' THEN ${schema.attendanceOvertimeRequests.requestedMinutes} ELSE 0 END), 0)::int`,
        employeeCount:
          sql<number>`count(distinct ${schema.attendanceOvertimeRequests.employeeId})::int`,
      })
      .from(schema.attendanceOvertimeRequests)
      .where(
        and(
          gte(schema.attendanceOvertimeRequests.workDate, from),
          lte(schema.attendanceOvertimeRequests.workDate, to),
        ),
      );

    return {
      approvedMinutes: row?.approvedMinutes ?? 0,
      pendingMinutes: row?.pendingMinutes ?? 0,
      employeeCount: row?.employeeCount ?? 0,
    };
  }

  async getAttendanceTrend(
    from: string,
    to: string,
  ): Promise<{ date: string; present: number; absent: number; late: number }[]> {
    return this.db
      .select({
        date: schema.attendanceDailySummaries.workDate,
        present:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} = 'present' THEN 1 END)::int`,
        absent:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} = 'absent' THEN 1 END)::int`,
        late:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.lateMinutes} > 0 THEN 1 END)::int`,
      })
      .from(schema.attendanceDailySummaries)
      .where(
        and(
          gte(schema.attendanceDailySummaries.workDate, from),
          lt(schema.attendanceDailySummaries.workDate, to),
        ),
      )
      .groupBy(schema.attendanceDailySummaries.workDate)
      .orderBy(schema.attendanceDailySummaries.workDate);
  }

  async getPeriodMetrics(
    from: string,
    to: string,
  ): Promise<{
    presentRecords: number;
    totalRecords: number;
    avgWorkedMinutes: number;
  }> {
    const [row] = await this.db
      .select({
        presentRecords:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} IN ('present', 'late', 'early_leave') OR ${schema.attendanceDailySummaries.workedMinutes} > 0 THEN 1 END)::int`,
        totalRecords:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} IN ('present', 'late', 'early_leave', 'absent', 'leave') THEN 1 END)::int`,
        avgWorkedMinutes:
          sql<number>`coalesce(avg(CASE WHEN ${schema.attendanceDailySummaries.workedMinutes} > 0 THEN ${schema.attendanceDailySummaries.workedMinutes} END), 0)::float`,
      })
      .from(schema.attendanceDailySummaries)
      .where(
        and(
          gte(schema.attendanceDailySummaries.workDate, from),
          lte(schema.attendanceDailySummaries.workDate, to),
        ),
      );

    return {
      presentRecords: row?.presentRecords ?? 0,
      totalRecords: row?.totalRecords ?? 0,
      avgWorkedMinutes: Number(row?.avgWorkedMinutes ?? 0),
    };
  }

  async getDepartmentAttendanceMetrics(
    from: string,
    to: string,
  ): Promise<
    Array<{
      departmentId: string | null;
      presentRecords: number;
      totalRecords: number;
    }>
  > {
    return this.db
      .select({
        departmentId: schema.employees.departmentId,
        presentRecords:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} IN ('present', 'late', 'early_leave') OR ${schema.attendanceDailySummaries.workedMinutes} > 0 THEN 1 END)::int`,
        totalRecords:
          sql<number>`count(CASE WHEN ${schema.attendanceDailySummaries.status} IN ('present', 'late', 'early_leave', 'absent', 'leave') THEN 1 END)::int`,
      })
      .from(schema.attendanceDailySummaries)
      .innerJoin(
        schema.employees,
        and(
          eq(schema.attendanceDailySummaries.employeeId, schema.employees.id),
          isNull(schema.employees.deletedAt),
        ),
      )
      .where(
        and(
          gte(schema.attendanceDailySummaries.workDate, from),
          lte(schema.attendanceDailySummaries.workDate, to),
        ),
      )
      .groupBy(schema.employees.departmentId);
  }
}
