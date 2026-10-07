import { DomainEvent } from "../domain-event.base";

export type AssignmentCreatedPayload = {
  assignmentId: string;
  employeeId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export class AssignmentCreatedEvent extends DomainEvent<AssignmentCreatedPayload> {
  static readonly eventType = "schedule.assignment.created.v1";
  static readonly eventVersion = 1;

  constructor(payload: AssignmentCreatedPayload, correlationId?: string) {
    super(AssignmentCreatedEvent.eventType, "schedule", payload, correlationId);
  }
}
