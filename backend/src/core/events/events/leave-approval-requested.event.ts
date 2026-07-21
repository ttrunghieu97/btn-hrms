import { DomainEvent } from "../domain-event.base";

export type LeaveApprovalRequestedPayload = {
  /** Semantic idempotency key: `${leaveRequestId}:leave.approval.requested` */
  idempotencyKey: string;
  leaveRequestId: string;
  employeeId: string;
  leaveTypeId: string;
  requestedByUserId: string | null;
  requestedAt: string;
};

export class LeaveApprovalRequestedEvent extends DomainEvent<LeaveApprovalRequestedPayload> {
  static readonly eventType = "leave.approval.requested.v1";
  static readonly eventVersion = 1;

  constructor(payload: LeaveApprovalRequestedPayload, correlationId?: string) {
    super(
      LeaveApprovalRequestedEvent.eventType,
      "workforce",
      payload,
      correlationId,
    );
  }
}
