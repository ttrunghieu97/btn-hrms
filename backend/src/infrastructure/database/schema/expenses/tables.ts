import {
  pgTable, uuid, text, timestamp, integer, numeric, date, boolean,
  index, unique,
} from "drizzle-orm/pg-core";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";
import { files } from "../_shared/files";

export const expenseClaimStatusEnum = {
  draft: "draft", submitted: "submitted", approved: "approved",
  rejected: "rejected", reimbursed: "reimbursed", closed: "closed",
} as const;

export const expenseClaims = pgTable(
  "expense_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft","submitted","approved","rejected","reimbursed","closed"] }).default("draft").notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("VND").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    reimbursedAt: timestamp("reimbursed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxClaimEmployee: index("idx_expense_claims_employee").on(t.employeeId),
    idxClaimStatus: index("idx_expense_claims_status").on(t.status),
  }),
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    maxReimbursablePerClaim: numeric("max_reimbursable_per_claim", { precision: 14, scale: 2 }),
    requiresReceipt: boolean("requires_receipt").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const expenseItems = pgTable(
  "expense_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => expenseClaims.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => expenseCategories.id),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    expenseDate: date("expense_date").notNull(),
    currency: text("currency").default("VND").notNull(),
    receiptRequired: boolean("receipt_required").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxItemClaim: index("idx_expense_items_claim").on(t.claimId),
  }),
);

export const expenseAttachments = pgTable(
  "expense_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => expenseClaims.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").references(() => files.id),
    fileName: text("file_name").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxAttachClaim: index("idx_expense_attachments_claim").on(t.claimId),
  }),
);
