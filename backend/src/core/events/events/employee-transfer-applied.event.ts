import { DomainEvent } from "../domain-event.base";

export type EmployeeTransferAppliedPayload = {
  employeeId: string;
  appliedByUserId: string | null;
  workflowInstanceId: string;
  effectiveDate: string;
  toDepartmentId: string;
  fromOrgAssignmentId: string;
  toOrgAssignmentId: string;
};

export class EmployeeTransferAppliedEvent extends DomainEvent<EmployeeTransferAppliedPayload> {
  static readonly eventType = "workforce.employee.transfer-applied.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeTransferAppliedPayload, correlationId?: string) {
    super(EmployeeTransferAppliedEvent.eventType, "workforce", payload, correlationId);
  }
}
