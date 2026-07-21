import { type AttendanceViolationRule, type ReconciliationContext, type AttendanceViolation } from "../interfaces";

export class UnscheduledAttendanceRule implements AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[] {
    const { session, assignment } = context;

    // Checked in but has no scheduled assignment
    if (!assignment && session.actualStart) {
      return [
        {
          code: "UNSCHEDULED_ATTENDANCE",
          severity: "WARNING",
          status: "OPEN",
          autoResolvable: false,
          requiresApproval: true,
          metadata: {
            actualStart: session.actualStart instanceof Date ? session.actualStart.toISOString() : String(session.actualStart),
          },
        },
      ];
    }

    return [];
  }
}
