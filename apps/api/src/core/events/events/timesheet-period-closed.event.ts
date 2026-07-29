import { DomainEvent } from "../domain-event.base";

export type TimesheetPeriodClosedPayload = {
  period: string;
  actorUserId: string;
  remarks: string;
  snapshotCount: number;
};

export class TimesheetPeriodClosedEvent extends DomainEvent<TimesheetPeriodClosedPayload> {
  static readonly eventType = "timesheet.period.closed.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetPeriodClosedPayload) {
    super(TimesheetPeriodClosedEvent.eventType, "attendance", payload);
  }
}
