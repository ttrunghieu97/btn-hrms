import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";
import { parseDateTimeInTimezone } from "../date-utils";

export class EarlyDepartureRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, policy } = context;
    if (!session.plannedEnd || !session.actualEnd) {
      return [];
    }

    const timezone = session.timezone ?? "Asia/Ho_Chi_Minh";
    const plannedEnd = parseDateTimeInTimezone(session.date, session.plannedEnd, timezone);
    const actualEnd = new Date(session.actualEnd);

    if (actualEnd.getTime() < plannedEnd.getTime()) {
      const minutesEarly = Math.floor((plannedEnd.getTime() - actualEnd.getTime()) / 60000);
      const graceMinutes = policy.earlyDepartureGraceMinutes ?? 0;

      if (minutesEarly > graceMinutes) {
        return [
          {
            code: "EARLY_DEPARTURE",
            severity: "WARNING",
            status: "OPEN",
            autoResolvable: false,
            requiresApproval: true,
            metadata: {
              minutesEarly,
              plannedEnd: session.plannedEnd,
              actualEnd: actualEnd.toISOString(),
            },
          },
        ];
      }
    }

    return [];
  }
}
