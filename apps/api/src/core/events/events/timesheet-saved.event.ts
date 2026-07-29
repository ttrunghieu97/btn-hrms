import { DomainEvent } from "../domain-event.base";

export type TimesheetSavedPayload = {
  period: string;
  recordCount: number;
  actorUserId: string;
};

export class TimesheetSavedEvent extends DomainEvent<TimesheetSavedPayload> {
  static readonly eventType = "timesheet.saved.v1";
  static readonly eventVersion = 1;

  constructor(payload: TimesheetSavedPayload) {
    super(TimesheetSavedEvent.eventType, "attendance", payload);
  }
}
