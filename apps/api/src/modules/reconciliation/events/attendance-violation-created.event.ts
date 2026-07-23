import { DomainEvent } from "../../../core/events/domain-event.base";

export class AttendanceViolationCreatedEvent extends DomainEvent<{
  violationId: string;
  sessionId: string;
  employeeId: string;
  code: string;
  severity: string;
  status: string;
}> {
  constructor(payload: {
    violationId: string;
    sessionId: string;
    employeeId: string;
    code: string;
    severity: string;
    status: string;
  }) {
    super("attendance.violation.created.v1", "reconciliation", payload);
  }
}
