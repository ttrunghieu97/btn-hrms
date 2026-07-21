import { DomainEvent } from "../domain-event.base";

export type AssignmentCancelledPayload = {
  assignmentId: string;
  employeeId: string;
  reason: string | null;
};

export class AssignmentCancelledEvent extends DomainEvent<AssignmentCancelledPayload> {
  static readonly eventType = "schedule.assignment.cancelled.v1";
  static readonly eventVersion = 1;

  constructor(payload: AssignmentCancelledPayload, correlationId?: string) {
    super(AssignmentCancelledEvent.eventType, "schedule", payload, correlationId);
  }
}
