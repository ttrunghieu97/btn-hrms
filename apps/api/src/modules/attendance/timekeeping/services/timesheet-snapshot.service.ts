import { Inject, Injectable } from "@nestjs/common";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import {
  ATTENDANCE_READ_PORT,
  AttendanceReadPort,
} from "../../../../contracts/ports/attendance-read.port";

export type TimesheetSnapshotData = {
  period: string;
  employeeId: string;
  workingDays: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
};

/**
 * Creates immutable snapshots of resolved Attendance Truth when a period
 * transitions to CLOSED. Snapshots are consumed by Payroll and downstream.
 *
 * Uses AttendanceReadPort (published contract) to fetch resolved truth
 * instead of querying base tables directly — ensures overrides and
 * exception resolutions are included (Rule #5, Rule #6).
 */
@Injectable()
export class TimesheetSnapshotService {
  constructor(
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
    @Inject(ATTENDANCE_READ_PORT)
    private readonly attendanceRead: AttendanceReadPort,
  ) {}

  /**
   * Create snapshot for all employees in a period.
   * Called when period transitions to CLOSED.
   *
   * Consumes resolved truth via AttendanceReadPort — captures overrides,
   * exceptions, and policy results (not base summaries).
   */
  async createSnapshotForPeriod(
    period: string,
    periodStatus: string,
  ): Promise<number> {
    const [year, month] = period.split("-").map(Number);
    const daysInMonth = new Date(year!, month!, 0).getDate();
    const from = `${period}-01`;
    const to = `${period}-${String(daysInMonth).padStart(2, "0")}`;

    // Get employee IDs with attendance data in this period
    const employeeIds = await this.timekeepingRepo.findEmployeeIdsWithSummariesInRange(from, to);

    if (employeeIds.length === 0) return 0;

    // Fetch resolved truth via published contract
    // mergeOverride() applies: override > summary > computation
    const summaries = await this.attendanceRead.getEffectiveDailySummaries(
      employeeIds,
      from,
      to,
    );

    // Group by employee and aggregate resolved values
    const grouped = new Map<
      string,
      {
        workingDays: number;
        workedMinutes: number;
        lateMinutes: number;
        earlyLeaveMinutes: number;
        overtimeMinutes: number;
      }
    >();

    for (const row of summaries) {
      const existing = grouped.get(row.employeeId) ?? {
        workingDays: 0,
        workedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
      };
      const isWorkingDay =
        row.status &&
        !["absent", "leave", "holiday", "off"].includes(row.status);
      if (isWorkingDay) existing.workingDays++;
      existing.workedMinutes += row.workedMinutes;
      existing.lateMinutes += row.lateMinutes;
      existing.earlyLeaveMinutes += row.earlyLeaveMinutes;
      existing.overtimeMinutes += row.overtimeMinutes;
      grouped.set(row.employeeId, existing);
    }

    // Batch insert immutable snapshots
    const values = Array.from(grouped.entries()).map(
      ([employeeId, data]) => ({
        period,
        employeeId,
        snapshotVersion: 1,
        workingDays: data.workingDays,
        workedMinutes: data.workedMinutes,
        lateMinutes: data.lateMinutes,
        earlyLeaveMinutes: data.earlyLeaveMinutes,
        overtimeMinutes: data.overtimeMinutes,
        periodStatusAtSnapshot: periodStatus,
      }),
    );

    await this.timekeepingRepo.insertTimesheetSnapshots(values as any);
    return values.length;
  }
}

