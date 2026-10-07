import { DomainEvent } from "../domain-event.base";

export type PerformanceCycleOpenedPayload = {
  cycleId: string;
  openedByUserId: string;
};

export class PerformanceCycleOpenedEvent extends DomainEvent<PerformanceCycleOpenedPayload> {
  static readonly eventType = "performance.cycle.opened.v1";
  static readonly eventVersion = 1;

  constructor(payload: PerformanceCycleOpenedPayload, correlationId?: string) {
    super(PerformanceCycleOpenedEvent.eventType, "performance", payload, correlationId);
  }
}
