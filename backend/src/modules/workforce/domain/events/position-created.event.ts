import { DomainEvent } from "../../../../core/events/domain-event.base";

export interface PositionCreatedPayload {
  positionId: string;
  title: string;
  departmentId?: string;
}

export class PositionCreatedEvent extends DomainEvent<PositionCreatedPayload> {
  constructor(data: PositionCreatedPayload, correlationId?: string) {
    super("workforce.position.created", "/workforce", data, correlationId);
  }
}

