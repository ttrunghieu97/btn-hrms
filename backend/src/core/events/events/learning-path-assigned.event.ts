import { DomainEvent } from "../domain-event.base";
export type LearningPathAssignedEventPayload = { assignmentId: string; pathId: string; employeeId: string; assignedByUserId: string };
export class LearningPathAssignedEvent extends DomainEvent<LearningPathAssignedEventPayload> {
  static readonly eventType = "learning.path.assigned.v1";
  static readonly eventVersion = 1;
  constructor(payload: LearningPathAssignedEventPayload, correlationId?: string) {
    super(LearningPathAssignedEvent.eventType, "learning", payload, correlationId);
  }
}
