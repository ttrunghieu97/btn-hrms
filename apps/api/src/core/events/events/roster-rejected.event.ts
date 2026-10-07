import { DomainEvent } from "../domain-event.base";

export type RosterRejectedPayload = {
  branchId: string | null;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
  rejectedByUserId: string;
  reason: string;
};

export class RosterRejectedEvent extends DomainEvent<RosterRejectedPayload> {
  static readonly eventType = "schedule.roster.rejected.v1";
  static readonly eventVersion = 1;

  constructor(payload: RosterRejectedPayload, correlationId?: string) {
    super(RosterRejectedEvent.eventType, "schedule", payload, correlationId);
  }
}
