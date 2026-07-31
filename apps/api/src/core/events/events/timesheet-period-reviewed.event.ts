import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodReviewedPayload = {
  period: string;
  actorUserId: string;
};

export class TimesheetPeriodReviewedEvent extends DomainEvent<TimesheetPeriodReviewedPayload> {
  static readonly eventType = "timesheet.period.reviewed.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodReviewedPayload) {
    super(TimesheetPeriodReviewedEvent.eventType, "attendance", payload);
  }
}
