import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";
import { parseDateTimeInTimezone } from "../date-utils";

export class AbsentRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, assignment, evaluatedAt } = context;

    // Must have assignment, but never checked in
    if (assignment && !session.actualStart) {
      // If session is explicitly marked as MISSED
      if (session.status === "MISSED") {
        return [
          {
            code: "ABSENT",
            severity: "ERROR",
            status: "OPEN",
            autoResolvable: false,
            requiresApproval: true,
            metadata: {
              sessionStatus: session.status,
              plannedStart: session.plannedStart,
            },
          },
        ];
      }

      // If session is READY or IN_PROGRESS but plannedStart has passed by some margin (e.g. 2 hours / 120 minutes)
      if (session.plannedStart) {
        const timezone = session.timezone ?? "Asia/Ho_Chi_Minh";
        const plannedStart = parseDateTimeInTimezone(session.date, session.plannedStart, timezone);

        const checkTime = plannedStart.getTime() + 120 * 60 * 1000;
        if (evaluatedAt.getTime() > checkTime) {
          return [
            {
              code: "ABSENT",
              severity: "ERROR",
              status: "OPEN",
              autoResolvable: false,
              requiresApproval: true,
              metadata: {
                plannedStart: session.plannedStart,
                evaluatedAt: evaluatedAt.toISOString(),
              },
            },
          ];
        }
      }
    }

    return [];
  }
}
