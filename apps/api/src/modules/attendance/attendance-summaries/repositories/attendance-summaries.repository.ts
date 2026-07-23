import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import { and, count, desc, eq, inArray, SQL } from "drizzle-orm";
import { AttendanceSummaryQueryDto } from "../dto/attendance-summary-query.dto";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";

type SummaryWithEmployee = typeof schema.attendanceDailySummaries.$inferSelect & {
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { id: string; name: string } | null;
  } | null;
};

function buildWhere(query: AttendanceSummaryQueryDto) {
  const conditions: SQL[] = [];
  if (query.employeeId) {
    conditions.push(eq(schema.attendanceDailySummaries.employeeId, query.employeeId));
  }
  if (query.status) {
    conditions.push(eq(schema.attendanceDailySummaries.status, query.status as "present" | "absent" | "late" | "early_leave" | "leave" | "holiday" | "off"));
  }
  if (!conditions.length) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

/**
 * Pure read-only repository for attendance daily summaries.
 * The only writer is timekeeping (RecomputeAttendanceDayUseCase).
 * No update/delete/write methods — use the overrides table for corrections.
 */
@Injectable()
export class AttendanceSummariesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findById(id: string): Promise<SummaryWithEmployee | null> {
    return (await this.db.query.attendanceDailySummaries.findFirst({
      where: eq(schema.attendanceDailySummaries.id, id),
      with: { employee: { with: { department: true } } },
    })) ?? null;
  }

  async findByEmployeeAndDate(
    employeeId: string,
    workDate: string,
  ): Promise<SummaryWithEmployee | null> {
    return (await this.db.query.attendanceDailySummaries.findFirst({
      where: and(
        eq(schema.attendanceDailySummaries.employeeId, employeeId),
        eq(schema.attendanceDailySummaries.workDate, workDate),
      ),
      with: { employee: { with: { department: true } } },
    })) ?? null;
  }

  async findByEmployeeAndDates(
    employeeId: string,
    workDates: string[],
  ): Promise<SummaryWithEmployee[]> {
    if (!workDates.length) return [];
    return this.db.query.attendanceDailySummaries.findMany({
      where: and(
        eq(schema.attendanceDailySummaries.employeeId, employeeId),
        inArray(schema.attendanceDailySummaries.workDate, workDates),
      ),
    });
  }

  async findByLeaveRequestId(leaveRequestId: string): Promise<SummaryWithEmployee[]> {
    return this.db.query.attendanceDailySummaries.findMany({
      where: eq(schema.attendanceDailySummaries.leaveRequestId, leaveRequestId),
      orderBy: [desc(schema.attendanceDailySummaries.workDate)],
    });
  }

  async findMany(query?: AttendanceSummaryQueryDto): Promise<SummaryWithEmployee[]> {
    return this.list(query ?? new AttendanceSummaryQueryDto()).then((r) => r.rows);
  }

  async list(query: AttendanceSummaryQueryDto = new AttendanceSummaryQueryDto()) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;
    const where = buildWhere(query);
    const rows = await this.db.query.attendanceDailySummaries.findMany({
      where,
      with: { employee: { with: { department: true } } },
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
}



