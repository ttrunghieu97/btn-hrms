import { DomainEvent } from "../domain-event.base";

export type EmployeeRehiredPayload = {
  employeeId: string;
  rehiredByUserId: string | null;
  hireDate: string;
  status: string;
  departmentId?: string | null;
  positionId?: string | null;
  newEmploymentRecordId: string;
};

export class EmployeeRehiredEvent extends DomainEvent<EmployeeRehiredPayload> {
  static readonly eventType = "workforce.employee.rehired.v1";
  static readonly eventVersion = 1;

  constructor(payload: EmployeeRehiredPayload, correlationId?: string) {
    super(EmployeeRehiredEvent.eventType, "workforce", payload, correlationId);
  }
}
