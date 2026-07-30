import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodReopenedPayload = {
  period: string;
  actorUserId: string;
  remarks: string;
};

export class TimesheetPeriodReopenedEvent extends DomainEvent<TimesheetPeriodReopenedPayload> {
  static readonly eventType = "timesheet.period.reopened.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodReopenedPayload) {
    super(TimesheetPeriodReopenedEvent.eventType, "attendance", payload);
  }
}
