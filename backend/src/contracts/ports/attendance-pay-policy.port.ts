import { type EffectiveAttendanceSummary } from "./attendance-read.port";

export type AttendanceOutcome =
  | "present"
  | "absent"
  | "leave"
  | "holiday"
  | "off"
  | "blocked";

export interface AttendancePayResult {
  payableMinutes: number;
  payableOvertimeMinutes: number;
  payableDayFraction: number;
  blockedReasons: string[];
  attendanceOutcome: AttendanceOutcome;
}

export interface AttendancePayPolicyContext {
  includeUnresolvedAsPayable?: boolean;
}

export const ATTENDANCE_PAY_POLICY = "ATTENDANCE_PAY_POLICY";

export interface AttendancePayPolicy {
  evaluate(
    summary: EffectiveAttendanceSummary,
    context?: AttendancePayPolicyContext,
  ): AttendancePayResult;
}
