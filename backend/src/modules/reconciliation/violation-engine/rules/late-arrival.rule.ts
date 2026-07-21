import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";
import { parseDateTimeInTimezone } from "../date-utils";

export class LateArrivalRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, policy } = context;
    if (!session.plannedStart || !session.actualStart) {
      return [];
    }

    const timezone = session.timezone ?? "Asia/Ho_Chi_Minh";
    const plannedStart = parseDateTimeInTimezone(session.date, session.plannedStart, timezone);
    const actualStart = new Date(session.actualStart);

    if (actualStart.getTime() > plannedStart.getTime()) {
      const minutesLate = Math.floor((actualStart.getTime() - plannedStart.getTime()) / 60000);
      const graceMinutes = policy.lateGraceMinutes ?? 0;

      if (minutesLate > graceMinutes) {
        return [
          {
            code: "LATE_ARRIVAL",
            severity: "WARNING",
            status: "OPEN",
            autoResolvable: false,
            requiresApproval: true,
            metadata: {
              minutesLate,
              plannedStart: session.plannedStart,
              actualStart: actualStart.toISOString(),
            },
          },
        ];
      }
    }

    return [];
  }
}
