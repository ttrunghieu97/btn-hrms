import { DomainEvent } from "../domain-event.base";
export type SessionCancelledEventPayload = { sessionId: string; courseId: string };
export class SessionCancelledEvent extends DomainEvent<SessionCancelledEventPayload> {
  static readonly eventType = "learning.session.cancelled.v1";
  static readonly eventVersion = 1;
  constructor(payload: SessionCancelledEventPayload, correlationId?: string) {
    super(SessionCancelledEvent.eventType, "learning", payload, correlationId);
  }
}
