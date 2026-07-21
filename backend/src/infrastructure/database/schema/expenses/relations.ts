import { relations } from "drizzle-orm";
import { expenseClaims, expenseCategories, expenseItems, expenseAttachments } from "./tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const expenseClaimsRelations = relations(expenseClaims, ({ one, many }) => ({
  employee: one(employees, { fields: [expenseClaims.employeeId], references: [employees.id] }),
  approvedByUser: one(users, { fields: [expenseClaims.approvedByUserId], references: [users.id] }),
  items: many(expenseItems),
  attachments: many(expenseAttachments),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  items: many(expenseItems),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  claim: one(expenseClaims, { fields: [expenseItems.claimId], references: [expenseClaims.id] }),
  category: one(expenseCategories, { fields: [expenseItems.categoryId], references: [expenseCategories.id] }),
}));

export const expenseAttachmentsRelations = relations(expenseAttachments, ({ one }) => ({
  claim: one(expenseClaims, { fields: [expenseAttachments.claimId], references: [expenseClaims.id] }),
}));
