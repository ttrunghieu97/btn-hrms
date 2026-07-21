import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { leaveRequests } from "../attendance/tables";
import { approvalRequests, approvalPolicies } from "../platform-approval-engine/tables";
import { approvalRequestStatusEnum } from "../platform-approval-engine/enums";

/**
 * Maps leave requests ↔ approval requests for the approval engine.
 * Each leave request creates at most one active link.
 * Enforced at DB level:
 *    UNIQUE(leave_request_id)      — one approval per leave
 *    UNIQUE(approval_request_id)   — one leave per approval
 */
export const leaveApprovalLinks = pgTable(
  "leave_approval_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leaveRequestId: uuid("leave_request_id")
      .notNull()
      .unique()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
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
    idxLeaveRequest: index("idx_leave_approval_links_leave_request_id").on(
      t.leaveRequestId,
    ),
    idxApprovalRequest: index(
      "idx_leave_approval_links_approval_request_id",
    ).on(t.approvalRequestId),
    idxStatus: index("idx_leave_approval_links_status").on(t.status),
  }),
);
