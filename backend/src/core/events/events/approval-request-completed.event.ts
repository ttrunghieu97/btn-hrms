import { DomainEvent } from "../domain-event.base";

export type ApprovalRequestCompletedPayload = {
  idempotencyKey: string;
  approvalRequestId: string;
  policyKey: string;
  subjectType: string;
  subjectId: string;
  outcome: "approved" | "rejected" | "cancelled";
  completedAt: string;
};

export class ApprovalRequestCompletedEvent extends DomainEvent<ApprovalRequestCompletedPayload> {
  static readonly eventType = "approval.request.completed.v1";
  static readonly eventVersion = 1;

  constructor(payload: ApprovalRequestCompletedPayload, correlationId?: string) {
    super(
      ApprovalRequestCompletedEvent.eventType,
      "platform-approval-engine",
      payload,
      correlationId,
    );
  }
}
