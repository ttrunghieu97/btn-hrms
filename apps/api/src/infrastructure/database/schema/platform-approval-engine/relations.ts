import { relations } from "drizzle-orm";
import { approvalPolicies, approvalRequests, approvalSteps } from "./tables";
import { users } from "../identity/tables";

export const approvalPoliciesRelations = relations(
  approvalPolicies,
  ({ many }) => ({
    requests: many(approvalRequests),
  }),
);

export const approvalRequestsRelations = relations(
  approvalRequests,
  ({ one, many }) => ({
    policy: one(approvalPolicies, {
      fields: [approvalRequests.policyId],
      references: [approvalPolicies.id],
    }),
    requestedBy: one(users, {
      fields: [approvalRequests.requestedByUserId],
      references: [users.id],
    }),
    steps: many(approvalSteps),
  }),
);

export const approvalStepsRelations = relations(approvalSteps, ({ one }) => ({
  request: one(approvalRequests, {
    fields: [approvalSteps.requestId],
    references: [approvalRequests.id],
  }),
  approver: one(users, {
    fields: [approvalSteps.approverUserId],
    references: [users.id],
    relationName: "approver_steps",
  }),
  decidedBy: one(users, {
    fields: [approvalSteps.decidedByUserId],
    references: [users.id],
    relationName: "decided_steps",
  }),
}));
