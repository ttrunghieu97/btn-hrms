import { DomainEvent } from "../domain-event.base";
export type SessionScheduledEventPayload = { sessionId: string; courseId: string; scheduledAt: string };
export class SessionScheduledEvent extends DomainEvent<SessionScheduledEventPayload> {
  static readonly eventType = "learning.session.scheduled.v1";
  static readonly eventVersion = 1;
  constructor(payload: SessionScheduledEventPayload, correlationId?: string) {
    super(SessionScheduledEvent.eventType, "learning", payload, correlationId);
  }
}
