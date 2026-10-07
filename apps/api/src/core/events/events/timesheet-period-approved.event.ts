import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodApprovedPayload = {
  period: string;
  actorUserId: string;
};

export class TimesheetPeriodApprovedEvent extends DomainEvent<TimesheetPeriodApprovedPayload> {
  static readonly eventType = "timesheet.period.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodApprovedPayload) {
    super(TimesheetPeriodApprovedEvent.eventType, "attendance", payload);
  }
}
