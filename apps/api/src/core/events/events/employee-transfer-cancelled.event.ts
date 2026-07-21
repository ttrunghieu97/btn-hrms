import { DomainEvent } from "../domain-event.base";

export type EmployeeTransferCancelledPayload = {
  employeeId: string;
  cancelledByUserId: string | null;
  workflowInstanceId: string;
  reason: string | null;
};

export class EmployeeTransferCancelledEvent extends DomainEvent<EmployeeTransferCancelledPayload> {
  static readonly eventType = "workforce.employee.transfer-cancelled.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTransferCancelledPayload, correlationId?: string) {
    super(EmployeeTransferCancelledEvent.eventType, "workforce", payload, correlationId);
  }
}
