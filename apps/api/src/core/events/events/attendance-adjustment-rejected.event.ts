import { DomainEvent } from "../domain-event.base";

export type AttendanceAdjustmentRejectedPayload = {
  adjustmentId: string;
  period: string;
  rejectedByUserId: string;
  reason: string;
};

export class AttendanceAdjustmentRejectedEvent extends DomainEvent<AttendanceAdjustmentRejectedPayload> {
  static readonly eventType = "attendance.adjustment.rejected.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendanceAdjustmentRejectedPayload) {
    super(AttendanceAdjustmentRejectedEvent.eventType, "attendance", payload);
  }
}
