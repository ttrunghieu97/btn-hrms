import { DomainEvent } from "../domain-event.base";

export type AssetRequestApprovalRequestedPayload = {
  /** Semantic idempotency key: `${requestId}:asset.request.approval.requested` */
  idempotencyKey: string;
  requestId: string;
  requesterEmployeeId: string;
  requestedByUserId: string | null;
  requestedAt: string;
};

/**
 * Emitted when an asset request is submitted for approval. Consumed by the
 * asset-approval integration, which routes it through the approval engine.
 */
export class AssetRequestApprovalRequestedEvent extends DomainEvent<AssetRequestApprovalRequestedPayload> {
  static readonly eventType = "asset.request.approval.requested.v1";
  static readonly eventVersion = 1;

  constructor(
    payload: AssetRequestApprovalRequestedPayload,
    correlationId?: string,
  ) {
    super(
      AssetRequestApprovalRequestedEvent.eventType,
      "asset-management",
      payload,
      correlationId,
    );
  }
}
