import { DomainEvent } from "../domain-event.base";
export type LearningPathCompletedEventPayload = { assignmentId: string; pathId: string; employeeId: string };
export class LearningPathCompletedEvent extends DomainEvent<LearningPathCompletedEventPayload> {
  static readonly eventType = "learning.path.completed.v1";
  static readonly eventVersion = 1;
  constructor(payload: LearningPathCompletedEventPayload, correlationId?: string) {
    super(LearningPathCompletedEvent.eventType, "learning", payload, correlationId);
  }
}
