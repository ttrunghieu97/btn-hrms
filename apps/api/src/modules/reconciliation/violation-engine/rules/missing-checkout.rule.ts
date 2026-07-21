import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";
import { parseDateTimeInTimezone } from "../date-utils";

export class MissingCheckOutRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, evaluatedAt } = context;

    // Checked in but never checked out
    if (session.actualStart && !session.actualEnd) {
      // If the session status is terminal (MISSED, CANCELLED), or completed (but actualEnd missing, which is an error)
      if (session.status === "COMPLETED" || session.status === "MISSED" || session.status === "CANCELLED") {
        return [
          {
            code: "MISSING_CHECK_OUT",
            severity: "ERROR",
            status: "OPEN",
            autoResolvable: false,
            requiresApproval: true,
            metadata: {
              sessionStatus: session.status,
            },
          },
        ];
      }

      // If the session is IN_PROGRESS but plannedEnd has passed by some margin (e.g. 2 hours / 120 minutes)
      if (session.plannedEnd) {
        const timezone = session.timezone ?? "Asia/Ho_Chi_Minh";
        const plannedEnd = parseDateTimeInTimezone(session.date, session.plannedEnd, timezone);

        // Add 2 hours grace period before raising missing check-out for active sessions
        const checkTime = plannedEnd.getTime() + 120 * 60 * 1000;
        if (evaluatedAt.getTime() > checkTime) {
          return [
            {
              code: "MISSING_CHECK_OUT",
              severity: "ERROR",
              status: "OPEN",
              autoResolvable: false,
              requiresApproval: true,
              metadata: {
                plannedEnd: session.plannedEnd,
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
