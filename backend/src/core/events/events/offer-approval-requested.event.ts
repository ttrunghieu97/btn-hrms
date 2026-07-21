import { DomainEvent } from "../domain-event.base";

export type OfferApprovalRequestedPayload = {
  /** Semantic idempotency key: `${offerId}:recruitment.offer.approval.requested` */
  idempotencyKey: string;
  offerId: string;
  applicationId: string;
  requestedByUserId: string | null;
  requestedAt: string;
};

export class OfferApprovalRequestedEvent extends DomainEvent<OfferApprovalRequestedPayload> {
  static readonly eventType = "recruitment.offer.approval.requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: OfferApprovalRequestedPayload, correlationId?: string) {
    super(
      OfferApprovalRequestedEvent.eventType,
      "recruitment",
      payload,
      correlationId,
    );
  }
}
