import { DomainEvent } from "../domain-event.base";

export type RosterSubmittedPayload = {
  branchId: string | null;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
  submittedByUserId: string;
};

export class RosterSubmittedEvent extends DomainEvent<RosterSubmittedPayload> {
  static readonly eventType = "schedule.roster.submitted.v1";
  static readonly eventVersion = 1;

  constructor(payload: RosterSubmittedPayload, correlationId?: string) {
    super(RosterSubmittedEvent.eventType, "schedule", payload, correlationId);
  }
}
