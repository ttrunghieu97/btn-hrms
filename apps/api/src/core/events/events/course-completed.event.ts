import { DomainEvent } from "../domain-event.base";
export type CourseCompletedEventPayload = { enrollmentId: string; courseId: string; employeeId: string; completedAt: string };
export class CourseCompletedEvent extends DomainEvent<CourseCompletedEventPayload> {
  static readonly eventType = "learning.course.completed.v1";
  static readonly eventVersion = 1;
  constructor(payload: CourseCompletedEventPayload, correlationId?: string) {
    super(CourseCompletedEvent.eventType, "learning", payload, correlationId);
  }
}
