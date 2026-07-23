import { type WorkflowDefinitionConfig } from "./types";

export const EXPENSE_APPROVAL_WORKFLOW: WorkflowDefinitionConfig = {
  key: "expense_approval",
  version: 1,
  name: "Expense Approval",
  initialState: "submitted",
  states: {
    submitted: {},
    manager_review: {},
    finance_review: {},
    approved: { terminal: true },
    rejected: { terminal: true },
    cancelled: { terminal: true },
  },
  transitions: {
    route_to_manager: { from: "submitted", to: "manager_review" },
    manager_approve: { from: "manager_review", to: "finance_review" },
    finance_approve: { from: "finance_review", to: "approved" },
    reject: { from: ["manager_review", "finance_review"], to: "rejected" },
    cancel: { from: ["submitted", "manager_review", "finance_review"], to: "cancelled" },
  },
};

