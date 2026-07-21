import { pgEnum } from "drizzle-orm/pg-core";

export const expenseClaimStatusEnum = pgEnum("expense_claim_status_enum", [
  "draft",
  "submitted",
  "pending_manager",
  "pending_finance",
  "approved",
  "rejected",
  "paid",
  "cancelled",
]);

export const expenseApprovalStatusEnum = pgEnum("expense_approval_status_enum", [
  "pending",
  "approved",
  "rejected",
]);
