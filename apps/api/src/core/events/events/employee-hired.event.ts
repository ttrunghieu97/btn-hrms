import { DomainEvent } from "../domain-event.base";

export type EmployeeHiredPayload = {
  scopeId: string;
  employeeId: string;
  userId: string;
  hiredByUserId: string | null;
};

export class EmployeeHiredEvent extends DomainEvent<EmployeeHiredPayload> {
  static readonly eventType = "workforce.employee.hired.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeHiredPayload, correlationId?: string) {
    super(EmployeeHiredEvent.eventType, "recruitment", payload, correlationId);
  }
}
