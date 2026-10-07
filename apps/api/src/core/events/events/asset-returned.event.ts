import { DomainEvent } from "../domain-event.base";

export type AssetReturnedItemSnapshot = {
  issueLineId: string;
  assetId: string | null;
  assetTypeId: string;
  quantity: number;
};

export type AssetReturnedPayload = {
  /** Semantic idempotency key: `${issueLineId}:asset.returned` */
  idempotencyKey: string;
  issueId: string;
  employeeId: string;
  returnedByUserId: string | null;
  returnedAt: string;
  items: AssetReturnedItemSnapshot[];
};

/**
 * Emitted after an asset return commits. Publishing must not fail when no
 * subscriber is registered.
 */
export class AssetReturnedEvent extends DomainEvent<AssetReturnedPayload> {
  static readonly eventType = "asset.returned.v1";
  static readonly eventVersion = 1;

  constructor(payload: AssetReturnedPayload, correlationId?: string) {
    super(AssetReturnedEvent.eventType, "asset-management", payload, correlationId);
  }
}
