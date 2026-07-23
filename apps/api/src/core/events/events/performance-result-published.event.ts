import { DomainEvent } from "../domain-event.base";

export type PerformanceResultPublishedPayload = {
  cycleId: string;
  employeeId: string;
  finalScore: string | null;
  ratingLabel: string | null;
  decidedByUserId: string;
};

export class PerformanceResultPublishedEvent extends DomainEvent<PerformanceResultPublishedPayload> {
  static readonly eventType = "performance.result.published.v1";
  static readonly eventVersion = 1;

  constructor(payload: PerformanceResultPublishedPayload, correlationId?: string) {
    super(PerformanceResultPublishedEvent.eventType, "performance", payload, correlationId);
  }
}
