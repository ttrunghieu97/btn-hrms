import { DomainEvent } from "../domain-event.base";

export type EmployeeOnboardedPayload = {
  scopeId: string;
  employeeId: string;
  userId: string;
  completedByUserId?: string | null;
};

export class EmployeeOnboardedEvent extends DomainEvent<EmployeeOnboardedPayload> {
  static readonly eventType = "workforce.employee.onboarded.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeOnboardedPayload, correlationId?: string) {
    super(EmployeeOnboardedEvent.eventType, "onboarding", payload, correlationId);
  }
}
