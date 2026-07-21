import { DomainEvent } from "../domain-event.base";

export type EmployeeTransferRequestedPayload = {
  employeeId: string;
  requestedByUserId: string | null;
  effectiveDate: string;
  toDepartmentId: string;
  toPositionId: string | null;
  toManagerEmployeeId: string | null;
  reason: string | null;
  workflowInstanceId: string;
};

export class EmployeeTransferRequestedEvent extends DomainEvent<EmployeeTransferRequestedPayload> {
  static readonly eventType = "workforce.employee.transfer-requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTransferRequestedPayload, correlationId?: string) {
    super(EmployeeTransferRequestedEvent.eventType, "workforce", payload, correlationId);
  }
}
