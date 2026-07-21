import { pgEnum } from "drizzle-orm/pg-core";

// Relocated from onboarding: the lifecycle status of a serialized asset unit.
export const assetStatusEnum = pgEnum("asset_status_enum", [
  "available",
  "assigned",
  "maintenance",
  "retired",
  "lost",
]);

// Lifecycle of an asset request (order -> approval -> fulfilment).
export const assetRequestStatusEnum = pgEnum("asset_request_status_enum", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
  "fulfilled",
]);

// The open/returned state of a single issue line (derived holding state).
export const assetIssueLineStatusEnum = pgEnum("asset_issue_line_status_enum", [
  "open",
  "returned",
]);

// Append-only asset lifecycle history — the authoritative log. Holdings and
// stock levels are projections derived from these entries.
export const assetHistoryKindEnum = pgEnum("asset_history_kind_enum", [
  "created",
  "received",
  "reserved",
  "issued",
  "returned",
  "transferred",
  "maintenance",
  "disposed",
  "adjusted",
]);

// Subjects that route through the approval engine. Currently only asset
// requests require approval.
export const assetApprovalSubjectEnum = pgEnum("asset_approval_subject_enum", [
  "request",
]);
