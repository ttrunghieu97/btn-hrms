import { DomainEvent } from "../domain-event.base";
export type CourseAssignedEventPayload = { assignmentId: string; courseId: string; employeeId: string; assignedByUserId: string };
export class CourseAssignedEvent extends DomainEvent<CourseAssignedEventPayload> {
  static readonly eventType = "learning.course.assigned.v1";
  static readonly eventVersion = 1;
  constructor(payload: CourseAssignedEventPayload, correlationId?: string) {
    super(CourseAssignedEvent.eventType, "learning", payload, correlationId);
  }
}
