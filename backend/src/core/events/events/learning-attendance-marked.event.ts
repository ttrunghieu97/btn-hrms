import { DomainEvent } from "../domain-event.base";
export type LearningAttendanceMarkedEventPayload = { sessionId: string; courseId: string; employeeId: string; status: string };
export class LearningAttendanceMarkedEvent extends DomainEvent<LearningAttendanceMarkedEventPayload> {
  static readonly eventType = "learning.attendance.marked.v1";
  static readonly eventVersion = 1;
  constructor(payload: LearningAttendanceMarkedEventPayload, correlationId?: string) {
    super(LearningAttendanceMarkedEvent.eventType, "learning", payload, correlationId);
  }
}
