import { type WorkflowDefinitionConfig } from "./types";

export const PAYROLL_APPROVAL_WORKFLOW: WorkflowDefinitionConfig = {
  key: "payroll_approval",
  version: 1,
  name: "Payroll Approval",
  initialState: "generated",
  states: {
    generated: {},
    manager_review: {},
    finance_review: {},
    approved: {},
    processed: { terminal: true },
    rejected: { terminal: true },
  },
  transitions: {
    route_to_manager: { from: "generated", to: "manager_review" },
    manager_approve: { from: "manager_review", to: "finance_review" },
    finance_approve: { from: "finance_review", to: "approved" },
    process: { from: "approved", to: "processed" },
    reject: { from: ["manager_review", "finance_review"], to: "rejected" },
  },
};

