import { DomainEvent } from "../domain-event.base";

export type EmployeeTransferApprovedPayload = {
  employeeId: string;
  approvedByUserId: string | null;
  workflowInstanceId: string;
  effectiveDate: string;
};

export class EmployeeTransferApprovedEvent extends DomainEvent<EmployeeTransferApprovedPayload> {
  static readonly eventType = "workforce.employee.transfer-approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTransferApprovedPayload, correlationId?: string) {
    super(EmployeeTransferApprovedEvent.eventType, "workforce", payload, correlationId);
  }
}
