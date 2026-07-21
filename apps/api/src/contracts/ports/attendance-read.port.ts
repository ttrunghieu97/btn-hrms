export interface EffectiveAttendanceSummary {
  employeeId: string;
  workDate: string;
  status: string;
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  hasOverride: boolean;
  exceptionState: "none" | "pending" | "resolved" | "closed";
}

export const ATTENDANCE_READ_PORT = "ATTENDANCE_READ_PORT";

export interface AttendanceReadPort {
  getEffectiveDailySummaries(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<EffectiveAttendanceSummary[]>;
}
