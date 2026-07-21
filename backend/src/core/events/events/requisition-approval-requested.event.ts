import { DomainEvent } from "../domain-event.base";

export type RequisitionApprovalRequestedPayload = {
  /** Semantic idempotency key: `${requisitionId}:recruitment.requisition.approval.requested` */
  idempotencyKey: string;
  requisitionId: string;
  departmentId: string;
  requestedByUserId: string | null;
  requestedAt: string;
};

export class RequisitionApprovalRequestedEvent extends DomainEvent<RequisitionApprovalRequestedPayload> {
  static readonly eventType = "recruitment.requisition.approval.requested.v1";
  static readonly eventVersion = 1;

  constructor(
    payload: RequisitionApprovalRequestedPayload,
    correlationId?: string,
  ) {
    super(
      RequisitionApprovalRequestedEvent.eventType,
      "recruitment",
      payload,
      correlationId,
    );
  }
}
