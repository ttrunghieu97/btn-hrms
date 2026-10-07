import { DomainEvent } from "../domain-event.base";

export type AttendanceAdjustmentAppliedPayload = {
  adjustmentId: string;
  period: string;
};

export class AttendanceAdjustmentAppliedEvent extends DomainEvent<AttendanceAdjustmentAppliedPayload> {
  static readonly eventType = "attendance.adjustment.applied.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendanceAdjustmentAppliedPayload) {
    super(AttendanceAdjustmentAppliedEvent.eventType, "attendance", payload);
  }
}
