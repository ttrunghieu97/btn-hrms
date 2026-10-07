import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodLockedPayload = {
  period: string;
  actorUserId: string;
  remarks?: string;
};

export class TimesheetPeriodLockedEvent extends DomainEvent<TimesheetPeriodLockedPayload> {
  static readonly eventType = "timesheet.period.locked.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodLockedPayload) {
    super(TimesheetPeriodLockedEvent.eventType, "attendance", payload);
  }
}
