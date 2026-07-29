import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodUnlockedPayload = {
  period: string;
  actorUserId: string;
  remarks: string;
};

export class TimesheetPeriodUnlockedEvent extends DomainEvent<TimesheetPeriodUnlockedPayload> {
  static readonly eventType = "timesheet.period.unlocked.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodUnlockedPayload) {
    super(TimesheetPeriodUnlockedEvent.eventType, "attendance", payload);
  }
}
