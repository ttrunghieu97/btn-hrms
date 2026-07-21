import { DomainEvent } from "../domain-event.base";

export type EmployeeStatusChangedPayload = {
  employeeId: string;
  fromStatus: string;
  toStatus: string;
  changedByUserId: string | null;
  effectiveDate: string;
  reason: string | null;
};

export class EmployeeStatusChangedEvent extends DomainEvent<EmployeeStatusChangedPayload> {
  static readonly eventType = "workforce.employee.status-changed.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeStatusChangedPayload, correlationId?: string) {
    super(EmployeeStatusChangedEvent.eventType, "workforce", payload, correlationId);
  }
}
