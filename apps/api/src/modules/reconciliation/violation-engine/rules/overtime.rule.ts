import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";
import { parseDateTimeInTimezone } from "../date-utils";

export class OvertimeRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, policy } = context;

    // Rule 1: explicit OT session
    if (session.sessionType === "OT" && session.actualStart && session.actualEnd) {
      const actualStart = new Date(session.actualStart);
      const actualEnd = new Date(session.actualEnd);
      const workedMinutes = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000));

      return [
        {
          code: "OVERTIME",
          severity: "INFO",
          status: "OPEN",
          autoResolvable: false,
          requiresApproval: true,
          metadata: {
            overtimeMinutes: workedMinutes,
            sessionType: "OT",
            actualStart: actualStart.toISOString(),
            actualEnd: actualEnd.toISOString(),
          },
        },
      ];
    }

    // Rule 2: regular session extending past planned end
    if (session.plannedStart && session.plannedEnd && session.actualStart && session.actualEnd) {
      const timezone = session.timezone ?? "Asia/Ho_Chi_Minh";
      const plannedStart = parseDateTimeInTimezone(session.date, session.plannedStart, timezone);
      const plannedEnd = parseDateTimeInTimezone(session.date, session.plannedEnd, timezone);
      const actualStart = new Date(session.actualStart);
      const actualEnd = new Date(session.actualEnd);

      const scheduledMinutes = Math.max(0, Math.floor((plannedEnd.getTime() - plannedStart.getTime()) / 60000));
      const workedMinutes = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000));
      const excessMinutes = workedMinutes - scheduledMinutes;
      const minOtMinutes = policy.overtimeMinMinutes ?? 30;

      if (excessMinutes >= minOtMinutes) {
        return [
          {
            code: "OVERTIME",
            severity: "INFO",
            status: "OPEN",
            autoResolvable: false,
            requiresApproval: true,
            metadata: {
              overtimeMinutes: excessMinutes,
              actualStart: actualStart.toISOString(),
              actualEnd: actualEnd.toISOString(),
            },
          },
        ];
      }
    }

    return [];
  }
}
