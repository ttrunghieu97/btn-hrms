import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService } from "../services/attendance-period-lock.service";
import {
  TimesheetWorkspaceQueryDto,
  TimesheetWorkspaceResponseDto,
  TimesheetWorkspaceEmployeeDto,
  TimesheetWorkspaceRecordDto,
} from "../dto/timesheet-workspace.dto";

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function daysInMonth(year: number, month: number): number {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return DAYS_IN_MONTH[month - 1]!;
}

@Injectable()
export class QueryTimesheetWorkspaceUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
  ) {}

  async execute(query: TimesheetWorkspaceQueryDto): Promise<TimesheetWorkspaceResponseDto> {
    const period = query.period;
    const [year, month] = period.split("-").map(Number);
    const lastDay = daysInMonth(year!, month!);
    const from = `${period}-01`;
    const to = `${period}-${String(lastDay).padStart(2, "0")}`;

    // 1. Period lock status
    const periodLock = await this.periodLockRepo.ensurePeriod(period);

    // 2. Fetch employees (optionally filtered by department)
    const conditions: any[] = [];
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
      .leftJoin(
        schema.orgAssignments,
        eq(schema.orgAssignments.employeeId, schema.employees.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.orgAssignments.departmentId),
      )
      .where(whereClause)
      .orderBy(schema.employees.firstName);

    const employees: TimesheetWorkspaceEmployeeDto[] = employeeRows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
      departmentName: r.departmentName ?? null,
    }));

    // 3. Fetch attendance daily summaries + clock events for the period
    const employeeIds = employees.map((e) => e.id);
    if (employeeIds.length === 0) {
      return { period, periodStatus: periodLock.status, employees, records: [] };
    }

    const summaryRows = await this.db
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
      .where(
        inArray(schema.attendanceDailySummaries.employeeId, employeeIds) as any,
      );

    // Fetch clock events to get raw check-in/check-out times
    const eventRows = await this.db
      .select({
        employeeId: schema.attendances.employeeId,
        date: schema.attendances.date,
        type: schema.attendances.type,
        time: schema.attendances.time,
      })
      .from(schema.attendances)
      .where(
        inArray(schema.attendances.employeeId, employeeIds) as any,
      );

    // Build a map of employeeId-workDate → { checkIn, checkOut }
    const eventMap = new Map<string, { checkIn: string | null; checkOut: string | null }>();
    for (const event of eventRows) {
      if (event.date < from || event.date > to) continue;
      const key = `${event.employeeId}_${event.date}`;
      const entry = eventMap.get(key) ?? { checkIn: null, checkOut: null };
      const timeStr = event.time ? event.time.toISOString() : null;
      if (event.type === "check_in" && timeStr) {
        entry.checkIn = timeStr;
      } else if (event.type === "check_out" && timeStr) {
        entry.checkOut = timeStr;
      }
      eventMap.set(key, entry);
    }

    // Merge summaries with event times
    const records: TimesheetWorkspaceRecordDto[] = [];
    for (const row of summaryRows) {
      if (row.workDate >= from && row.workDate <= to) {
        const key = `${row.employeeId}_${row.workDate}`;
        const times = eventMap.get(key);
        records.push({
          employeeId: row.employeeId,
          workDate: row.workDate,
          status: row.status,
          checkIn: times?.checkIn ?? null,
          checkOut: times?.checkOut ?? null,
          workedMinutes: row.workedMinutes ? Number(row.workedMinutes) : null,
          scheduledMinutes: row.scheduledMinutes ? Number(row.scheduledMinutes) : null,
          lateMinutes: row.lateMinutes ? Number(row.lateMinutes) : null,
          earlyLeaveMinutes: row.earlyLeaveMinutes ? Number(row.earlyLeaveMinutes) : null,
          overtimeMinutes: row.overtimeMinutes ? Number(row.overtimeMinutes) : null,
          isHoliday: row.isHoliday,
        });
      }
    }

    return { period, periodStatus: periodLock.status, employees, records };
  }
}
