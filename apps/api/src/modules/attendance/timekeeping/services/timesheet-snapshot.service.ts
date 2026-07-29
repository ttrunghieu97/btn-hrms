import { Inject, Injectable } from "@nestjs/common";
import { eq, and, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";

export type TimesheetSnapshotData = {
  period: string;
  employeeId: string;
  workingDays: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
};

@Injectable()
export class TimesheetSnapshotService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Create snapshot for all employees in a period.
   * Called when period transitions to CLOSED.
   */
  async createSnapshotForPeriod(
    period: string,
    periodStatus: string,
  ): Promise<number> {
    const [year, month] = period.split("-").map(Number);
    const daysInMonth = new Date(year!, month!, 0).getDate();
    const from = `${period}-01`;
    const to = `${period}-${String(daysInMonth).padStart(2, "0")}`;

    // Fetch all attendance summaries for the period
    const summaries = await this.db
      .select({
        employeeId: schema.attendanceDailySummaries.employeeId,
        status: schema.attendanceDailySummaries.status,
        workedMinutes: schema.attendanceDailySummaries.workedMinutes,
        lateMinutes: schema.attendanceDailySummaries.lateMinutes,
        earlyLeaveMinutes: schema.attendanceDailySummaries.earlyLeaveMinutes,
        overtimeMinutes: schema.attendanceDailySummaries.overtimeMinutes,
      })
      .from(schema.attendanceDailySummaries)
      .where(
        and(
          sql`${schema.attendanceDailySummaries.workDate} >= ${from}`,
          sql`${schema.attendanceDailySummaries.workDate} <= ${to}`,
        ),
      );

    // Group by employee
    const grouped = new Map<string, TimesheetSnapshotData>();
    for (const row of summaries) {
      if (!row.employeeId) continue;
      const existing = grouped.get(row.employeeId) ?? {
        period,
        employeeId: row.employeeId,
        workingDays: 0,
        workedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
      };
      const isWorkingDay = row.status && !["absent", "leave", "holiday", "off"].includes(row.status);
      if (isWorkingDay) existing.workingDays++;
      existing.workedMinutes += Number(row.workedMinutes ?? 0);
      existing.lateMinutes += Number(row.lateMinutes ?? 0);
      existing.earlyLeaveMinutes += Number(row.earlyLeaveMinutes ?? 0);
      existing.overtimeMinutes += Number(row.overtimeMinutes ?? 0);
      grouped.set(row.employeeId, existing);
    }

    if (grouped.size === 0) return 0;

    // Batch insert snapshots
    const values = Array.from(grouped.values()).map((data) => ({
      period: data.period,
      employeeId: data.employeeId,
      snapshotVersion: 1,
      workingDays: data.workingDays,
      workedMinutes: data.workedMinutes,
      lateMinutes: data.lateMinutes,
      earlyLeaveMinutes: data.earlyLeaveMinutes,
      overtimeMinutes: data.overtimeMinutes,
      periodStatusAtSnapshot: periodStatus,
    }));

    await this.db.insert(schema.timesheetSnapshots).values(values as any);
    return values.length;
  }
}
