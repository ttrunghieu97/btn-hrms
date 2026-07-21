import { DomainEvent } from "../domain-event.base";

export type EmployeeCreatedPayload = {
  employeeId: string;
};

export class EmployeeCreatedEvent extends DomainEvent<EmployeeCreatedPayload> {
  static readonly eventType = "workforce.employee.created.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeCreatedPayload, correlationId?: string) {
    super(EmployeeCreatedEvent.eventType, "workforce", payload, correlationId);
  }
}
