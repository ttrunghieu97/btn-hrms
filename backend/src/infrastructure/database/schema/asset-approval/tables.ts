import { pgTable, uuid, timestamp, index, unique } from "drizzle-orm/pg-core";
import {
  approvalRequests,
  approvalPolicies,
} from "../platform-approval-engine/tables";
import { approvalRequestStatusEnum } from "../platform-approval-engine/enums";
import { assetApprovalSubjectEnum } from "../asset-management/enums";

/**
 * Maps asset subjects (requests) ↔ approval requests.
 * Each subject creates at most one active link.
 * Enforced at DB level:
 *    UNIQUE(subject_type, subject_id) — one approval per subject
 *    UNIQUE(approval_request_id)      — one subject per approval
 */
export const assetApprovalLinks = pgTable(
  "asset_approval_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectType: assetApprovalSubjectEnum("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    approvalRequestId: uuid("approval_request_id")
      .notNull()
      .unique()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id").references(() => approvalPolicies.id, {
      onDelete: "set null",
    }),
    status: approvalRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uqSubject: unique("uq_asset_approval_links_subject").on(
      t.subjectType,
      t.subjectId,
    ),
    idxApprovalRequest: index(
      "idx_asset_approval_links_approval_request_id",
    ).on(t.approvalRequestId),
    idxStatus: index("idx_asset_approval_links_status").on(t.status),
  }),
);
