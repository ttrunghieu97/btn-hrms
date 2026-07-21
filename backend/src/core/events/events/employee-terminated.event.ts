import { DomainEvent } from "../domain-event.base";

export type EmployeeTerminatedPayload = {
  employeeId: string;
  terminatedByUserId: string | null;
  effectiveDate: string;
  reason: string | null;
};

export class EmployeeTerminatedEvent extends DomainEvent<EmployeeTerminatedPayload> {
  static readonly eventType = "workforce.employee.terminated.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTerminatedPayload, correlationId?: string) {
    super(EmployeeTerminatedEvent.eventType, "workforce", payload, correlationId);
  }
}
