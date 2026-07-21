import { DomainEvent } from "../domain-event.base";

export type LeaveCancellationRequestedPayload = {
  /** Semantic idempotency key: `${leaveRequestId}:leave.cancellation.requested` */
  idempotencyKey: string;
  leaveRequestId: string;
  cancelledByUserId: string;
};

export class LeaveCancellationRequestedEvent extends DomainEvent<LeaveCancellationRequestedPayload> {
  static readonly eventType = "leave.cancellation.requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: LeaveCancellationRequestedPayload, correlationId?: string) {
    super(
      LeaveCancellationRequestedEvent.eventType,
      "workforce",
      payload,
      correlationId,
    );
  }
}
