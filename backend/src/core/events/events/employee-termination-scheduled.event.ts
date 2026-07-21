import { DomainEvent } from "../domain-event.base";

export type EmployeeTerminationScheduledPayload = {
  employeeId: string;
  scheduledByUserId: string | null;
  effectiveDate: string;
  reason: string | null;
  lastWorkingDate: string | null;
  workflowInstanceId: string;
};

export class EmployeeTerminationScheduledEvent extends DomainEvent<EmployeeTerminationScheduledPayload> {
  static readonly eventType = "workforce.employee.termination-scheduled.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTerminationScheduledPayload, correlationId?: string) {
    super(EmployeeTerminationScheduledEvent.eventType, "workforce", payload, correlationId);
  }
}
