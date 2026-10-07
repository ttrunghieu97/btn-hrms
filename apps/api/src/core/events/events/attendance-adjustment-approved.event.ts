import { DomainEvent } from "../domain-event.base";

export type AttendanceAdjustmentApprovedPayload = {
  adjustmentId: string;
  period: string;
  approvedByUserId: string;
};

export class AttendanceAdjustmentApprovedEvent extends DomainEvent<AttendanceAdjustmentApprovedPayload> {
  static readonly eventType = "attendance.adjustment.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: AttendanceAdjustmentApprovedPayload) {
    super(AttendanceAdjustmentApprovedEvent.eventType, "attendance", payload);
  }
}
