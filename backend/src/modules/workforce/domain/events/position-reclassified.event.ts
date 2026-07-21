import { DomainEvent } from "../../../../core/events/domain-event.base";

export interface PositionReclassifiedPayload {
  positionId: string;
  oldGradeId?: string;
  newGradeId?: string;
  oldDepartmentId?: string;
  newDepartmentId?: string;
  effectiveDate: string;
}

export class PositionReclassifiedEvent extends DomainEvent<PositionReclassifiedPayload> {
  constructor(data: PositionReclassifiedPayload, correlationId?: string) {
    super("workforce.position.reclassified", "/workforce", data, correlationId);
  }
}

