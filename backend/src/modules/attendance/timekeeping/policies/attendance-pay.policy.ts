import { Injectable } from "@nestjs/common";
import {
  AttendancePayPolicy,
  AttendancePayPolicyContext,
  AttendancePayResult,
  AttendanceOutcome,
} from "../../../../contracts/ports/attendance-pay-policy.port";
import { EffectiveAttendanceSummary } from "../../../../contracts/ports/attendance-read.port";

@Injectable()
export class AttendancePayPolicyImpl implements AttendancePayPolicy {
  evaluate(
    summary: EffectiveAttendanceSummary,
    context?: AttendancePayPolicyContext,
  ): AttendancePayResult {
    const includeUnresolved = context?.includeUnresolvedAsPayable ?? false;
    const blockedReasons: string[] = [];

    let isBlocked = false;
    if (summary.exceptionState === "pending" && !includeUnresolved) {
      isBlocked = true;
      blockedReasons.push("Pending attendance exception");
    }

    const payableMinutes = isBlocked ? 0 : summary.workedMinutes;
    const payableOvertimeMinutes = isBlocked ? 0 : summary.overtimeMinutes;
    const payableDayFraction =
      summary.scheduledMinutes > 0 ? payableMinutes / summary.scheduledMinutes : 0;

    let attendanceOutcome: AttendanceOutcome = "present";
    if (isBlocked) {
      attendanceOutcome = "blocked";
    } else if (summary.status === "leave") {
      attendanceOutcome = "leave";
    } else if (summary.isHoliday) {
      attendanceOutcome = "holiday";
    } else if (summary.status === "off") {
      attendanceOutcome = "off";
    } else if (summary.status === "absent" || (summary.scheduledMinutes > 0 && payableMinutes === 0)) {
      attendanceOutcome = "absent";
    }

    return {
      payableMinutes,
      payableOvertimeMinutes,
      payableDayFraction,
      blockedReasons,
      attendanceOutcome,
    };
  }
}
