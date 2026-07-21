import { DomainEvent } from "../domain-event.base";

export type AssetIssueItemSnapshot = {
  issueLineId: string;
  assetId: string | null;
  assetTypeId: string;
  assetName: string | null;
  assetTag: string | null;
  serialNumber: string | null;
  quantity: number;
};

export type AssetAssignedPayload = {
  /** Semantic idempotency key: `${issueId}:asset.assigned` */
  idempotencyKey: string;
  issueId: string;
  employeeId: string;
  requestId: string | null;
  issuedByUserId: string | null;
  issuedAt: string;
  items: AssetIssueItemSnapshot[];
};

/**
 * Emitted after an asset issue commits. Carries a minimal item snapshot so
 * downstream consumers need no synchronous read-back. Publishing must not fail
 * when no subscriber is registered.
 */
export class AssetAssignedEvent extends DomainEvent<AssetAssignedPayload> {
  static readonly eventType = "asset.assigned.v1";
  static readonly eventVersion = 1;

  constructor(payload: AssetAssignedPayload, correlationId?: string) {
    super(AssetAssignedEvent.eventType, "asset-management", payload, correlationId);
  }
}
