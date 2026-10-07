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

    const { employees: employeeRows, summaries: summaryRows, events: eventRows, allowances: allowanceRows } =
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

    const allowanceMap = new Map<string, { type: string; amount: string }[]>();
    for (const a of allowanceRows) {
      const list = allowanceMap.get(a.employeeId) ?? [];
      list.push(a);
      allowanceMap.set(a.employeeId, list);
    }

    // Build event map
    const eventMap = new Map<string, {
      checkIn: string | null;
      checkOut: string | null;
      checkInMorning: string | null;
      checkOutMorning: string | null;
      checkInAfternoon: string | null;
      checkOutAfternoon: string | null;
    }>();
    for (const event of eventRows) {
      if (event.date < from || event.date > to) continue;
      const key = `${event.employeeId}_${event.date}`;
      const entry = eventMap.get(key) ?? {
        checkIn: null,
        checkOut: null,
        checkInMorning: null,
        checkOutMorning: null,
        checkInAfternoon: null,
        checkOutAfternoon: null,
      };
      const timeStr = event.time ? event.time.toISOString() : null;
      if (!timeStr) continue;

      const dateObj = new Date(event.time!);
      const h = dateObj.getHours();
      const session = event.session || (h < 12 ? "morning" : h < 14 ? "noon" : "afternoon");

      if (event.type === "check_in") {
        if (session === "morning" || (!entry.checkInMorning && h < 12)) {
          entry.checkInMorning = timeStr;
        } else if (session === "afternoon" || session === "noon" || h >= 12) {
          entry.checkInAfternoon = timeStr;
        }
        if (!entry.checkIn || dateObj < new Date(entry.checkIn)) {
          entry.checkIn = timeStr;
        }
      } else if (event.type === "check_out") {
        if (session === "morning" || (!entry.checkOutMorning && h < 13)) {
          entry.checkOutMorning = timeStr;
        } else if (session === "afternoon" || session === "noon" || h >= 13) {
          entry.checkOutAfternoon = timeStr;
        }
        if (!entry.checkOut || dateObj > new Date(entry.checkOut)) {
          entry.checkOut = timeStr;
        }
      }
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
        checkInMorning: times?.checkInMorning ?? null,
        checkOutMorning: times?.checkOutMorning ?? null,
        checkInAfternoon: times?.checkInAfternoon ?? null,
        checkOutAfternoon: times?.checkOutAfternoon ?? null,
        breakMinutes: row.breakMinutes ? Number(row.breakMinutes) : null,
        workedMinutes: row.workedMinutes ? Number(row.workedMinutes) : null,
        scheduledMinutes: row.scheduledMinutes ? Number(row.scheduledMinutes) : null,
        lateMinutes: row.lateMinutes ? Number(row.lateMinutes) : null,
        earlyLeaveMinutes: row.earlyLeaveMinutes ? Number(row.earlyLeaveMinutes) : null,
        overtimeMinutes: row.overtimeMinutes ? Number(row.overtimeMinutes) : null,
        personalBreakMinutes: row.personalBreakMinutes ? Number(row.personalBreakMinutes) : null,
        lunchDutyMinutes: row.lunchDutyMinutes ? Number(row.lunchDutyMinutes) : null,
        nightShiftDutyCount: row.nightShiftDutyCount ? Number(row.nightShiftDutyCount) : null,
        waterBoothDutyCount: row.waterBoothDutyCount ? Number(row.waterBoothDutyCount) : null,
        isHoliday: row.isHoliday,
        note: row.note ?? null,
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
      const empAllowances = allowanceMap.get(r.id) ?? [];
      const positionAllowances = empAllowances.filter((a) => a.type === "position");
      const responsibilityAllowance = positionAllowances.length > 0
        ? Number(positionAllowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0).toFixed(2))
        : null;
      const baseSalary = r.baseSalary ? Number(r.baseSalary) : null;

      return {
        id: r.id, employeeCode: r.employeeCode,
        fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
        departmentName: r.departmentName ?? null,
        jobTitle: r.jobTitle ?? null,
        baseSalary,
        responsibilityAllowance,
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

