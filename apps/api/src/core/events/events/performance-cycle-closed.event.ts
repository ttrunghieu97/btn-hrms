import { DomainEvent } from "../domain-event.base";

export type PerformanceCycleClosedPayload = {
  cycleId: string;
  closedByUserId: string;
};

export class PerformanceCycleClosedEvent extends DomainEvent<PerformanceCycleClosedPayload> {
  static readonly eventType = "performance.cycle.closed.v1";
  static readonly eventVersion = 1;

  constructor(payload: PerformanceCycleClosedPayload, correlationId?: string) {
    super(PerformanceCycleClosedEvent.eventType, "performance", payload, correlationId);
  }
}
