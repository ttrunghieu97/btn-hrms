import { DomainEvent } from "../domain-event.base";

export type PerformanceReviewedPayload = {
  scopeId: string;
  reviewId: string;
  employeeId: string;
  userId: string;
  reviewerUserId?: string | null;
};

export class PerformanceReviewedEvent extends DomainEvent<PerformanceReviewedPayload> {
  static readonly eventType = "performance.review.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: PerformanceReviewedPayload, correlationId?: string) {
    super(PerformanceReviewedEvent.eventType, "performance", payload, correlationId);
  }
}
