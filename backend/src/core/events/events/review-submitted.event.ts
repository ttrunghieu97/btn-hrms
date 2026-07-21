import { DomainEvent } from "../domain-event.base";

export type ReviewSubmittedPayload = {
  reviewAssignmentId: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  reviewType: string;
};

export class ReviewSubmittedEvent extends DomainEvent<ReviewSubmittedPayload> {
  static readonly eventType = "performance.review.submitted.v1";
  static readonly eventVersion = 1;

  constructor(payload: ReviewSubmittedPayload, correlationId?: string) {
    super(ReviewSubmittedEvent.eventType, "performance", payload, correlationId);
  }
}
