import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";

export interface ShiftContext {
  shiftTemplate?: {
    startTime?: string | null;
    endTime?: string | null;
    breakMinutes?: number | null;
    isNightShift?: boolean | null;
  } | null;
  employeeShiftAssignmentId?: string | null;
}

export interface AttendanceComputationResult {
  status: "present" | "late" | "early_leave" | "absent" | "off";
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  anomalyFlags: {
    missingPunch: boolean;
    invalidSequence: boolean;
    offShift: boolean;
  };
  sourceData: Record<string, any>  ;
}

@Injectable()
export class AttendanceTimeCalculationService {
  compute(
    events: { id: string; type: string; time: Date | string }[],
    shiftContext?: ShiftContext | null,
    graceMinutes = 0,
    workDate?: string,
    timezone = 'Asia/Ho_Chi_Minh',
  ): AttendanceComputationResult {
    const sorted = [...events].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    const checkIns = sorted.filter((e) => e.type === "check_in");
    const checkOuts = sorted.filter((e) => e.type === "check_out");

    const firstCheckIn = checkIns[0] ? new Date(checkIns[0].time) : null;
    const lastCheckOutEvent = checkOuts[checkOuts.length - 1];
    const lastCheckOut = lastCheckOutEvent
      ? new Date(lastCheckOutEvent.time)
      : null;

    const breakStartCount = sorted.filter(
      (e) => e.type === "break_start",
    ).length;
    const breakEndCount = sorted.filter((e) => e.type === "break_end").length;

    const missingPunch = Boolean(
      (firstCheckIn && !lastCheckOut) || (!firstCheckIn && lastCheckOut),
    );
    const invalidSequence =
      Boolean(
        firstCheckIn &&
        lastCheckOut &&
        lastCheckOut.getTime() < firstCheckIn.getTime(),
      ) || breakEndCount > breakStartCount;

    const scheduleBase = this.resolveScheduleBaseDate({
      workDate,
      firstCheckIn,
      lastCheckOut,
    }, timezone);

    const { scheduledMinutes, scheduledStart, scheduledEnd, breakMinutes } =
      this.resolveSchedule(shiftContext, scheduleBase, timezone);

    const offShift = !shiftContext?.shiftTemplate;

    let workedMinutes = 0;
    if (firstCheckIn && lastCheckOut && !invalidSequence) {
      workedMinutes = Math.max(
        0,
        Math.floor((lastCheckOut.getTime() - firstCheckIn.getTime()) / 60000),
      );
    }

    const deductedWorked = Math.max(0, workedMinutes - breakMinutes);

    let lateMinutes = 0;
    if (scheduledStart && firstCheckIn) {
      lateMinutes = Math.max(
        0,
        Math.floor(
          (firstCheckIn.getTime() - scheduledStart.getTime()) / 60000,
        ) - graceMinutes,
      );
    }

    let earlyLeaveMinutes = 0;
    if (scheduledEnd && lastCheckOut) {
      earlyLeaveMinutes = Math.max(
        0,
        Math.floor((scheduledEnd.getTime() - lastCheckOut.getTime()) / 60000),
      );
    }

    const overtimeMinutes = Math.max(0, deductedWorked - scheduledMinutes);

    let status: "present" | "late" | "early_leave" | "absent" | "off" =
      "present";
    if (!firstCheckIn && !lastCheckOut) {
      status = shiftContext?.shiftTemplate ? "absent" : "off";
    } else if (lateMinutes > 0) {
      status = "late";
    } else if (earlyLeaveMinutes > 0) {
      status = "early_leave";
    }

    return {
      status,
      scheduledMinutes,
      workedMinutes: deductedWorked,
      breakMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      anomalyFlags: {
        missingPunch,
        invalidSequence,
        offShift,
      },
      sourceData: {
        eventIds: sorted.map((event) => event.id),
        eventCount: sorted.length,
        checkInCount: checkIns.length,
        checkOutCount: checkOuts.length,
      },
    };
  }

  private getDatePartsInTimezone(date: Date, timezone: string): { year: number; month: number; day: number } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  private getTimezoneOffsetMinutes(date: Date, timezone: string): number {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const localDate = new Date(
      Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')),
    );
    return (localDate.getTime() - date.getTime()) / 60000;
  }

  private resolveScheduleBaseDate(
    params: { workDate?: string; firstCheckIn: Date | null; lastCheckOut: Date | null },
    timezone: string,
  ): Date {
    let year: number;
    let month: number;
    let day: number;
    if (params.workDate) {
      const [y, m, d] = params.workDate.split('-').map(Number);
      year = y!;
      month = m!;
      day = d!;
    } else {
      const reference = params.firstCheckIn ?? params.lastCheckOut ?? new Date();
      const parts = this.getDatePartsInTimezone(reference, timezone);
      year = parts.year;
      month = parts.month;
      day = parts.day;
    }
    const midnightLocal = Date.UTC(year, month - 1, day);
    const offsetMin = this.getTimezoneOffsetMinutes(new Date(midnightLocal), timezone);
    return new Date(midnightLocal - offsetMin * 60000);
  }

  private resolveSchedule(
    shiftContext: ShiftContext | null | undefined,
    scheduleBase: Date,
    timezone: string,
  ): {
    scheduledMinutes: number;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    breakMinutes: number;
  } {
    const template = shiftContext?.shiftTemplate;
    if (!template?.startTime || !template.endTime) {
      return {
        scheduledMinutes: 0,
        scheduledStart: null,
        scheduledEnd: null,
        breakMinutes: 0,
      };
    }

    const localParts = this.getDatePartsInTimezone(scheduleBase, timezone);
    const dateBase = `${localParts.year}-${String(localParts.month).padStart(2, '0')}-${String(localParts.day).padStart(2, '0')}`;

    const offsetMin = this.getTimezoneOffsetMinutes(scheduleBase, timezone);
    const offsetAbs = Math.abs(offsetMin);
    const offsetHours = Math.floor(offsetAbs / 60);
    const offsetMins = offsetAbs % 60;
    const offsetSign = offsetMin >= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

    const scheduledStart = new Date(`${dateBase}T${template.startTime}${offsetStr}`);
    let scheduledEnd = new Date(`${dateBase}T${template.endTime}${offsetStr}`);
    if (template.isNightShift || scheduledEnd <= scheduledStart) {
      scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    const total = Math.max(
      0,
      Math.floor((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000),
    );
    const breakMinutes = Math.max(0, Number(template.breakMinutes ?? 0));

    return {
      scheduledMinutes: Math.max(0, total - breakMinutes),
      scheduledStart,
      scheduledEnd,
      breakMinutes,
    };
  }
}



