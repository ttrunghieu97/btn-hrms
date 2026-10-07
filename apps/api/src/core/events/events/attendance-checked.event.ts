import { DomainEvent } from "../domain-event.base";

export class AttendanceCheckedEvent extends DomainEvent<{
  employeeId: string;
  type: string;
  date: string;
}> {
  constructor(
    public readonly employeeId: string,
    public readonly type: string,
    public readonly date: string,
  ) {
    super("AttendanceCheckedEvent", "attendance", { employeeId, type, date });
  }
}
