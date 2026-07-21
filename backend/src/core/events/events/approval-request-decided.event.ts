import { DomainEvent } from "../domain-event.base";

export type ApprovalRequestDecidedPayload = {
  /** Semantic idempotency key: `${approvalRequestId}:approval.request.decided` */
  idempotencyKey: string;
  approvalRequestId: string;
  subjectType: string;
  subjectId: string;
  decision: "approved" | "rejected";
  decidedByUserId: string | null;
  decidedAt: string;
};

export class ApprovalRequestDecidedEvent extends DomainEvent<ApprovalRequestDecidedPayload> {
  static readonly eventType = "approval.request.decided.v1";
  static readonly eventVersion = 1;

  constructor(payload: ApprovalRequestDecidedPayload, correlationId?: string) {
    super(
      ApprovalRequestDecidedEvent.eventType,
      "platform-approval-engine",
      payload,
      correlationId,
    );
  }
}
