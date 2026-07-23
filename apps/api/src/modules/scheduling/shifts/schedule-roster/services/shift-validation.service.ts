import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";
import { addDays, subDays, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { WorkforceShiftsRepository } from "../repositories/workforce-shifts.repository";

export interface ValidationResult {
  success: boolean;
  ruleName: string;
  message?: string;
}

export interface ShiftTimeRange {
  id?: string;
  date: string;
  startTime: string; // HH:MM:ss
  endTime: string; // HH:MM:ss
  isNightShift?: boolean;
}

@Injectable()
export class ShiftValidationService {
  constructor(
    private readonly repo: WorkforceShiftsRepository,
  ) {}


  /**
   * Helper to parse date and time into a Date object.
   * Handles overnight shifts if end time is less than start time.
   */
  private getAbsoluteInterval(dateStr: string, startTime: string, endTime: string): { start: Date; end: Date } {
    const baseDate = new Date(`${dateStr}T00:00:00.000Z`);
    const partsStart = startTime.split(":");
    const startH = Number(partsStart[0] ?? 0);
    const startM = Number(partsStart[1] ?? 0);

    const partsEnd = endTime.split(":");
    const endH = Number(partsEnd[0] ?? 0);
    const endM = Number(partsEnd[1] ?? 0);

    const start = new Date(baseDate);
    start.setUTCHours(startH, startM, 0, 0);

    const end = new Date(baseDate);
    end.setUTCHours(endH, endM, 0, 0);

    if (end < start) {
      // Overnight shift, end date is the next day
      end.setUTCDate(end.getUTCDate() + 1);
    }

    return { start, end };
  }

  /**
   * Check if two date intervals overlap.
   */
  private intervalsOverlap(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
    return s1 < e2 && s2 < e1;
  }

  /**
   * Run all enterprise validation rules for a prospective shift assignment.
   */
  async validateAssignment(
    employeeId: string,
    target: ShiftTimeRange
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Retrieve all active shift assignments for this employee around the target date (+/- 2 days to catch overlaps)
    const targetDate = new Date(`${target.date}T00:00:00.000Z`);
    const dateFrom = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(subDays(targetDate, 2));
    const dateTo = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(addDays(targetDate, 2));

    const existingRows = await this.repo.getEmployeeActiveAssignmentsByDateRange(
      employeeId,
      dateFrom,
      dateTo
    );


    const activeAssignments = existingRows
      .filter((row) => row.shiftTemplate && row.id !== target.id)
      .map((row) => ({
        id: row.id,
        date: row.assignmentDate,
        startTime: row.shiftTemplate!.startTime,
        endTime: row.shiftTemplate!.endTime,
      }));

    // 1. Rule: No Overlap
    const targetInterval = this.getAbsoluteInterval(target.date, target.startTime, target.endTime);
    let overlapConflict = false;

    for (const ext of activeAssignments) {
      const extInterval = this.getAbsoluteInterval(ext.date, ext.startTime, ext.endTime);
      if (this.intervalsOverlap(targetInterval.start, targetInterval.end, extInterval.start, extInterval.end)) {
        overlapConflict = true;
        break;
      }
    }

    results.push({
      success: !overlapConflict,
      ruleName: "NoOverlappingShifts",
      message: overlapConflict ? "Nhân viên đã được phân ca làm việc khác trùng khung giờ trong ngày này." : undefined,
    });

    // 2. Rule: Minimum Rest Period (11 hours)
    let restPeriodConflict = false;
    const minRestMinutes = 11 * 60;

    for (const ext of activeAssignments) {
      const extInterval = this.getAbsoluteInterval(ext.date, ext.startTime, ext.endTime);

      // Check gap when target is after existing
      if (targetInterval.start >= extInterval.end) {
        const gap = differenceInMinutes(targetInterval.start, extInterval.end);
        if (gap < minRestMinutes) {
          restPeriodConflict = true;
          break;
        }
      }
      // Check gap when existing is after target
      if (extInterval.start >= targetInterval.end) {
        const gap = differenceInMinutes(extInterval.start, targetInterval.end);
        if (gap < minRestMinutes) {
          restPeriodConflict = true;
          break;
        }
      }
    }

    results.push({
      success: !restPeriodConflict,
      ruleName: "MinimumRestPeriod",
      message: restPeriodConflict ? "Thời gian nghỉ ngơi giữa hai ca làm việc phải đạt tối thiểu 11 giờ." : undefined,
    });

    // 3. Rule: Max Weekly Hours (48 hours)
    const targetDurationMinutes = differenceInMinutes(targetInterval.end, targetInterval.start);
    const startOfTargetWeek = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(startOfWeek(targetDate, { weekStartsOn: 1 }));
    const endOfTargetWeek = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(endOfWeek(targetDate, { weekStartsOn: 1 }));

    const weeklyAssignments = await this.repo.getEmployeeActiveAssignmentsByDateRange(
      employeeId,
      startOfTargetWeek,
      endOfTargetWeek
    );


    let totalMinutes = targetDurationMinutes;
    for (const row of weeklyAssignments) {
      if (row.shiftTemplate && row.id !== target.id) {
        const extInterval = this.getAbsoluteInterval(row.assignmentDate, row.shiftTemplate.startTime, row.shiftTemplate.endTime);
        totalMinutes += differenceInMinutes(extInterval.end, extInterval.start);
      }
    }

    const maxWeeklyMinutes = 48 * 60;
    results.push({
      success: totalMinutes <= maxWeeklyMinutes,
      ruleName: "MaxWeeklyHours",
      message: totalMinutes > maxWeeklyMinutes ? `Tổng giờ làm việc trong tuần của nhân viên vượt quá giới hạn 48 giờ (${(totalMinutes / 60).toFixed(1)} giờ).` : undefined,
    });

    // 4. Rule: Max Consecutive Days (6 days)
    // Scan target date - 6 days and target date + 6 days
    const minStreakStart = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(subDays(targetDate, 6));
    const maxStreakEnd = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(addDays(targetDate, 6));

    const streakAssignments = await this.repo.getEmployeeActiveAssignmentsByDateRange(
      employeeId,
      minStreakStart,
      maxStreakEnd
    );


    const workDates = new Set<string>();
    for (const r of streakAssignments) {
      if (r.id !== target.id) {
        workDates.add(r.assignmentDate);
      }
    }
    workDates.add(target.date);

    // Calculate maximum consecutive streak centering around target date
    let maxStreak = 0;
    let currentStreak = 0;

    // Check from -6 to +6 days consecutively
    for (let i = -6; i <= 6; i++) {
      const checkDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(addDays(subDays(targetDate, 6), i + 6));
      if (workDates.has(checkDateStr)) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    results.push({
      success: maxStreak <= 6,
      ruleName: "MaxConsecutiveDays",
      message: maxStreak > 6 ? `Phân ca này khiến nhân sự phải làm việc liên tục quá 6 ngày (${maxStreak} ngày).` : undefined,
    });

    return results;
  }
}
