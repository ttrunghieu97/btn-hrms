import { DomainEvent } from "../domain-event.base";

export type LeaveRejectedPayload = {
  /** Semantic idempotency key: `${leaveRequestId}:leave.rejected` */
  idempotencyKey: string;
  leaveRequestId: string;
  employeeId: string;
  rejectedByUserId: string | null;
  rejectedAt: string;
  reason: string | null;
};

export class LeaveRejectedEvent extends DomainEvent<LeaveRejectedPayload> {
  static readonly eventType = "leave.rejected.v1";
  static readonly eventVersion = 1;

  constructor(payload: LeaveRejectedPayload, correlationId?: string) {
    super(
      LeaveRejectedEvent.eventType,
      "workforce",
      payload,
      correlationId,
    );
  }
}
