import { DomainEvent } from "../domain-event.base";

export type ApprovalRequestCreatedPayload = {
  idempotencyKey: string;
  approvalRequestId: string;
  policyId: string;
  policyKey: string;
  subjectType: string;
  subjectId: string;
  requestedByUserId: string | null;
  requestedAt: string;
};

export class ApprovalRequestCreatedEvent extends DomainEvent<ApprovalRequestCreatedPayload> {
  static readonly eventType = "approval.request.created.v1";
  static readonly eventVersion = 1;

  constructor(payload: ApprovalRequestCreatedPayload, correlationId?: string) {
    super(
      ApprovalRequestCreatedEvent.eventType,
      "platform-approval-engine",
      payload,
      correlationId,
    );
  }
}
