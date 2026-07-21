import { DomainEvent } from "../domain-event.base";

export type EmployeeTerminationCancelledPayload = {
  employeeId: string;
  cancelledByUserId: string | null;
  reason: string | null;
  workflowInstanceId: string;
};

export class EmployeeTerminationCancelledEvent extends DomainEvent<EmployeeTerminationCancelledPayload> {
  static readonly eventType = "workforce.employee.termination-cancelled.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTerminationCancelledPayload, correlationId?: string) {
    super(EmployeeTerminationCancelledEvent.eventType, "workforce", payload, correlationId);
  }
}
