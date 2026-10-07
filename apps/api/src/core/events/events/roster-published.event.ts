import { DomainEvent } from "../domain-event.base";

export type RosterPublishedPayload = {
  branchId: string | null;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
  publishedByUserId: string;
};

export class RosterPublishedEvent extends DomainEvent<RosterPublishedPayload> {
  static readonly eventType = "schedule.roster.published.v1";
  static readonly eventVersion = 1;

  constructor(payload: RosterPublishedPayload, correlationId?: string) {
    super(RosterPublishedEvent.eventType, "schedule", payload, correlationId);
  }
}
