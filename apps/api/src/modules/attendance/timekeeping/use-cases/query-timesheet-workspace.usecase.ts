import { Injectable } from "@nestjs/common";
import { computeAvailableActions } from "../services/period-lock.service";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService } from "../services/attendance-period-lock.service";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import {
  TimesheetWorkspaceQueryDto,
  TimesheetWorkspaceResponseDto,
  TimesheetWorkspaceEmployeeDto,
  TimesheetWorkspaceRecordDto,
  TimesheetWorkspacePeriodTotalsDto,
} from "../dto/timesheet-workspace.dto";

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function daysInMonth(year: number, month: number): number {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return DAYS_IN_MONTH[month - 1]!;
}

@Injectable()
export class QueryTimesheetWorkspaceUseCase {
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
  ) {}

  async execute(query: TimesheetWorkspaceQueryDto, permissions: string[] = []): Promise<TimesheetWorkspaceResponseDto> {
    const period = query.period;
    const [year, month] = period.split("-").map(Number);
    const lastDay = daysInMonth(year!, month!);
    const from = `${period}-01`;
    const to = `${period}-${String(lastDay).padStart(2, "0")}`;

    const periodLock = await this.periodLockRepo.ensurePeriod(period);
    const availableActions = computeAvailableActions(periodLock.status, permissions);

    const verificationRows = await this.periodLockRepo.listEmployeeVerification(period);
    const verificationMap = new Map(verificationRows.map((v) => [v.employeeId, v.status]));

    const { employees: employeeRows, summaries: summaryRows, events: eventRows } =
      await this.timekeepingRepo.findWorkspaceData({
        departmentId: query.departmentId,
        from,
        to,
      });

    const employeeIds = employeeRows.map((r) => r.id);
    if (employeeIds.length === 0) {
      return {
        period, periodStatus: periodLock.status, availableActions,
        totals: this.emptyTotals(),
        employees: [], records: [],
      };
    }

    // Build event map
    const eventMap = new Map<string, { checkIn: string | null; checkOut: string | null }>();
    for (const event of eventRows) {
      if (event.date < from || event.date > to) continue;
      const key = `${event.employeeId}_${event.date}`;
      const entry = eventMap.get(key) ?? { checkIn: null, checkOut: null };
      const timeStr = event.time ? event.time.toISOString() : null;
      if (event.type === "check_in" && timeStr) entry.checkIn = timeStr;
      else if (event.type === "check_out" && timeStr) entry.checkOut = timeStr;
      eventMap.set(key, entry);
    }

    // Per-employee stats
    const empStats = new Map<string, {
      workingDays: number; totalDays: number; lateCount: number;
      leaveCount: number; absentCount: number; otMinutes: number; workedMinutes: number;
    }>();
    for (const eid of employeeIds) {
      empStats.set(eid, { workingDays: 0, totalDays: lastDay, lateCount: 0, leaveCount: 0, absentCount: 0, otMinutes: 0, workedMinutes: 0 });
    }

    const records: TimesheetWorkspaceRecordDto[] = [];
    for (const row of summaryRows) {
      if (row.workDate < from || row.workDate > to) continue;
      const key = `${row.employeeId}_${row.workDate}`;
      const times = eventMap.get(key);
      records.push({
        employeeId: row.employeeId, workDate: row.workDate, status: row.status,
        checkIn: times?.checkIn ?? null, checkOut: times?.checkOut ?? null,
        workedMinutes: row.workedMinutes ? Number(row.workedMinutes) : null,
        scheduledMinutes: row.scheduledMinutes ? Number(row.scheduledMinutes) : null,
        lateMinutes: row.lateMinutes ? Number(row.lateMinutes) : null,
        earlyLeaveMinutes: row.earlyLeaveMinutes ? Number(row.earlyLeaveMinutes) : null,
        overtimeMinutes: row.overtimeMinutes ? Number(row.overtimeMinutes) : null,
        isHoliday: row.isHoliday,
      });
      // Aggregate per employee
      const s = empStats.get(row.employeeId);
      if (s) {
        const st = row.status;
        if (st && !["absent", "leave", "holiday", "off"].includes(st)) s.workingDays++;
        if (st === "late") s.lateCount++;
        if (st === "leave") s.leaveCount++;
        if (st === "absent") s.absentCount++;
        s.otMinutes += Number(row.overtimeMinutes ?? 0);
        s.workedMinutes += Number(row.workedMinutes ?? 0);
      }
    }

    // Build employee DTOs
    const employees: TimesheetWorkspaceEmployeeDto[] = employeeRows.map((r) => {
      const s = empStats.get(r.id) ?? { workingDays: 0, totalDays: lastDay, lateCount: 0, leaveCount: 0, absentCount: 0, otMinutes: 0, workedMinutes: 0 };
      return {
        id: r.id, employeeCode: r.employeeCode,
        fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
        departmentName: r.departmentName ?? null,
        workingDays: s.workingDays, totalDays: s.totalDays,
        completionRate: s.totalDays > 0 ? Math.round((s.workingDays / s.totalDays) * 100) : 0,
        lateCount: s.lateCount, leaveCount: s.leaveCount, absentCount: s.absentCount,
        otMinutes: s.otMinutes, workedMinutes: s.workedMinutes,
        verificationStatus: verificationMap.get(r.id) ?? "draft",
      };
    });

    // Period totals
    const totals: TimesheetWorkspacePeriodTotalsDto = {
      totalEmployees: employees.length,
      completedEmployees: employees.filter((e) => e.completionRate === 100).length,
      inProgressEmployees: employees.filter((e) => e.completionRate > 0 && e.completionRate < 100).length,
      notStartedEmployees: employees.filter((e) => e.completionRate === 0).length,
      totalWorkedMinutes: employees.reduce((a, e) => a + e.workedMinutes, 0),
      totalOtMinutes: employees.reduce((a, e) => a + e.otMinutes, 0),
      totalLateCount: employees.reduce((a, e) => a + e.lateCount, 0),
      totalLeaveCount: employees.reduce((a, e) => a + e.leaveCount, 0),
    };

    return { period, periodStatus: periodLock.status, availableActions, totals, employees, records };
  }

  private emptyTotals(): TimesheetWorkspacePeriodTotalsDto {
    return { totalEmployees: 0, completedEmployees: 0, inProgressEmployees: 0, notStartedEmployees: 0, totalWorkedMinutes: 0, totalOtMinutes: 0, totalLateCount: 0, totalLeaveCount: 0 };
  }
}

