import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import { and, count, desc, eq, SQL, inArray, gte, lte } from "drizzle-orm";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";

export type AttendanceSummaryWithOverride = {
  id: string;
  employeeId: string;
  employeeShiftAssignmentId: string | null;
  leaveRequestId: string | null;
  workDate: string;
  status: string;
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean | null;
  anomalyFlags: unknown;
  sourceData: unknown;
  createdAt: Date;
  updatedAt: Date;
  overrideStatus: string | null;
  overrideWorkedMinutes: number | null;
  overrideLateMinutes: number | null;
  overrideEarlyLeaveMinutes: number | null;
  overrideOvertimeMinutes: number | null;
  overrideReason: string | null;
  overrideNote: string | null;
  resolvedStatus: string;
  resolvedWorkedMinutes: number;
  resolvedLateMinutes: number;
  resolvedEarlyLeaveMinutes: number;
  resolvedOvertimeMinutes: number;
  hasOverride: boolean;
  exceptionState: "none" | "pending" | "resolved" | "closed";
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentName?: string | null;
  } | null;
};

function mergeOverride(
  base: typeof schema.attendanceDailySummaries.$inferSelect & {
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      department?: { name: string } | null;
    } | null;
    exceptions?: { status: string }[] | null;
  },
  override: typeof schema.attendanceSummaryOverrides.$inferSelect | null,
): AttendanceSummaryWithOverride {
  const hasOverride = override != null;

  const exceptions = base.exceptions ?? [];
  let exceptionState: "none" | "pending" | "resolved" | "closed" = "none";
  if (exceptions.some((ex) => ex.status === "pending")) {
    exceptionState = "pending";
  } else if (exceptions.some((ex) => ex.status === "resolved")) {
    exceptionState = "resolved";
  } else if (exceptions.some((ex) => ex.status === "closed")) {
    exceptionState = "closed";
  }

  return {
    id: base.id,
    employeeId: base.employeeId,
    employeeShiftAssignmentId: base.employeeShiftAssignmentId ?? null,
    leaveRequestId: base.leaveRequestId ?? null,
    workDate: base.workDate,
    status: base.status,
    scheduledMinutes: base.scheduledMinutes ?? 0,
    workedMinutes: base.workedMinutes ?? 0,
    breakMinutes: base.breakMinutes ?? 0,
    lateMinutes: base.lateMinutes ?? 0,
    earlyLeaveMinutes: base.earlyLeaveMinutes ?? 0,
    overtimeMinutes: base.overtimeMinutes ?? 0,
    isHoliday: base.isHoliday ?? null,
    anomalyFlags: base.anomalyFlags ?? null,
    sourceData: base.sourceData ?? null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    overrideStatus: override?.overriddenStatus ?? null,
    overrideWorkedMinutes: override?.overriddenWorkedMinutes ?? null,
    overrideLateMinutes: override?.overriddenLateMinutes ?? null,
    overrideEarlyLeaveMinutes: override?.overriddenEarlyLeaveMinutes ?? null,
    overrideOvertimeMinutes: override?.overriddenOvertimeMinutes ?? null,
    overrideReason: override?.reason ?? null,
    overrideNote: override?.note ?? null,
    resolvedStatus: override?.overriddenStatus ?? base.status,
    resolvedWorkedMinutes: override?.overriddenWorkedMinutes ?? (base.workedMinutes ?? 0),
    resolvedLateMinutes: override?.overriddenLateMinutes ?? (base.lateMinutes ?? 0),
    resolvedEarlyLeaveMinutes: override?.overriddenEarlyLeaveMinutes ?? (base.earlyLeaveMinutes ?? 0),
    resolvedOvertimeMinutes: override?.overriddenOvertimeMinutes ?? (base.overtimeMinutes ?? 0),
    hasOverride,
    exceptionState,
    employee: base.employee
      ? {
          id: base.employee.id,
          employeeCode: base.employee.employeeCode,
          firstName: base.employee.firstName,
          lastName: base.employee.lastName,
          departmentName: base.employee.department?.name ?? null,
        }
      : null,
  };
}

@Injectable()
export class AttendanceSummaryReadService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getById(id: string): Promise<AttendanceSummaryWithOverride | null> {
    const base = await this.db.query.attendanceDailySummaries.findFirst({
      where: eq(schema.attendanceDailySummaries.id, id),
      with: { employee: { with: { department: true } }, exceptions: true },
    });
    if (!base) return null;
    const override = await this.findOverride(base.employeeId, base.workDate);
    return mergeOverride(base, override);
  }

  async getByEmployeeAndDate(
    employeeId: string,
    workDate: string,
  ): Promise<AttendanceSummaryWithOverride | null> {
    const base = await this.db.query.attendanceDailySummaries.findFirst({
      where: and(
        eq(schema.attendanceDailySummaries.employeeId, employeeId),
        eq(schema.attendanceDailySummaries.workDate, workDate),
      ),
      with: { employee: { with: { department: true } }, exceptions: true },
    });
    if (!base) return null;
    const override = await this.findOverride(employeeId, workDate);
    return mergeOverride(base, override);
  }

  async list(params: {
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    rows: AttendanceSummaryWithOverride[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = safePage(params.page);
    const limit = safeLimit(params.limit);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (params.employeeId) {
      conditions.push(eq(schema.attendanceDailySummaries.employeeId, params.employeeId));
    }
    if (params.status) {
      conditions.push(
        eq(schema.attendanceDailySummaries.status, params.status as any),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [baseRows, totalResult] = await Promise.all([
      this.db.query.attendanceDailySummaries.findMany({
        where,
        with: { employee: { with: { department: true } }, exceptions: true },
        orderBy: [desc(schema.attendanceDailySummaries.workDate)],
        limit,
        offset,
      }),
      this.db
        .select({ value: count() })
        .from(schema.attendanceDailySummaries)
        .where(where),
    ]);

    if (baseRows.length === 0) {
      return { rows: [], total: 0, page, limit };
    }

    // Fetch overrides for each base row.
    // ponytail: batch with tuple IN if N+1 becomes measurable (>50 rows/page).
    const rows = await Promise.all(
      baseRows.map(async (base) => {
        const override = await this.findOverride(base.employeeId, base.workDate);
        return mergeOverride(base, override);
      }),
    );

    return { rows, total: Number(totalResult[0]?.value ?? 0), page, limit };
  }

  async getEffectiveSummaries(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<AttendanceSummaryWithOverride[]> {
    if (employeeIds.length === 0) return [];

    const baseRows = await this.db.query.attendanceDailySummaries.findMany({
      where: and(
        inArray(schema.attendanceDailySummaries.employeeId, employeeIds),
        gte(schema.attendanceDailySummaries.workDate, startDate),
        lte(schema.attendanceDailySummaries.workDate, endDate),
      ),
      with: { employee: { with: { department: true } }, exceptions: true },
      orderBy: [desc(schema.attendanceDailySummaries.workDate)],
    });

    if (baseRows.length === 0) return [];

    const overrideRows = await this.db.query.attendanceSummaryOverrides.findMany({
      where: and(
        inArray(schema.attendanceSummaryOverrides.employeeId, employeeIds),
        gte(schema.attendanceSummaryOverrides.workDate, startDate),
        lte(schema.attendanceSummaryOverrides.workDate, endDate),
      ),
    });

    const overridesMap = new Map<string, typeof schema.attendanceSummaryOverrides.$inferSelect>();
    for (const ov of overrideRows) {
      overridesMap.set(`${ov.employeeId}_${ov.workDate}`, ov);
    }

    return baseRows.map((base) => {
      const override = overridesMap.get(`${base.employeeId}_${base.workDate}`) ?? null;
      return mergeOverride(base, override);
    });
  }

  private async findOverride(
    employeeId: string,
    workDate: string,
  ): Promise<typeof schema.attendanceSummaryOverrides.$inferSelect | null> {
    return (await this.db.query.attendanceSummaryOverrides.findFirst({
      where: and(
        eq(schema.attendanceSummaryOverrides.employeeId, employeeId),
        eq(schema.attendanceSummaryOverrides.workDate, workDate),
      ),
    })) ?? null;
  }
}
