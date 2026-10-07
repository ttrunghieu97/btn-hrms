import { DomainEvent } from "../domain-event.base";

export type AttendanceAdjustmentRequestedPayload = {
  period: string;
  adjustmentId: string;
  employeeId: string;
  requestedByUserId: string;
};

export class AttendanceAdjustmentRequestedEvent extends DomainEvent<AttendanceAdjustmentRequestedPayload> {
  static readonly eventType = "attendance.adjustment.requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendanceAdjustmentRequestedPayload) {
    super(AttendanceAdjustmentRequestedEvent.eventType, "attendance", payload);
  }
}
