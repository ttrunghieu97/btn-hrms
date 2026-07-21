import { DomainEvent } from "../domain-event.base";

export type RosterApprovedPayload = {
  branchId: string | null;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
  approvedByUserId: string;
};

export class RosterApprovedEvent extends DomainEvent<RosterApprovedPayload> {
  static readonly eventType = "schedule.roster.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: RosterApprovedPayload, correlationId?: string) {
    super(RosterApprovedEvent.eventType, "schedule", payload, correlationId);
  }
}
