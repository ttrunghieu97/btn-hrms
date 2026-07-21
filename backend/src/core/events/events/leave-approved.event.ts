import { DomainEvent } from "../domain-event.base";

export type LeaveApprovedPayload = {
  /** Semantic idempotency key: `${leaveRequestId}:leave.approved` */
  idempotencyKey: string;
  leaveRequestId: string;
  employeeId: string;
  approvedByUserId: string | null;
  approvedAt: string;
  autoApproved: boolean;
};

export class LeaveApprovedEvent extends DomainEvent<LeaveApprovedPayload> {
  static readonly eventType = "leave.approved.v1";
  static readonly eventVersion = 1;

  constructor(payload: LeaveApprovedPayload, correlationId?: string) {
    super(
      LeaveApprovedEvent.eventType,
      "workforce",
      payload,
      correlationId,
    );
  }
}
