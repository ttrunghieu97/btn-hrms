import { DomainEvent } from "../../../../core/events/domain-event.base";

export interface DepartmentMovedPayload {
  departmentId: string;
  oldParentId?: string;
  newParentId?: string;
  effectiveDate: string;
}

export class DepartmentMovedEvent extends DomainEvent<DepartmentMovedPayload> {
  constructor(data: DepartmentMovedPayload, correlationId?: string) {
    super("workforce.department.moved", "/workforce", data, correlationId);
  }
}

