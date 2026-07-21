import { DomainEvent } from "../domain-event.base";

export type EmployeeTerminationExecutedPayload = {
  employeeId: string;
  effectiveDate: string;
  reason: string | null;
  lastWorkingDate: string | null;
  workflowInstanceId: string;
};

export class EmployeeTerminationExecutedEvent extends DomainEvent<EmployeeTerminationExecutedPayload> {
  static readonly eventType = "workforce.employee.termination-executed.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTerminationExecutedPayload, correlationId?: string) {
    super(EmployeeTerminationExecutedEvent.eventType, "workforce", payload, correlationId);
  }
}
