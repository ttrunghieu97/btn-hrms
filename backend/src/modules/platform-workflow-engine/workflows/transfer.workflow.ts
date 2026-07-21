import { type WorkflowDefinitionConfig } from "./types";

export const TRANSFER_WORKFLOW: WorkflowDefinitionConfig = {
  key: "transfer",
  version: 1,
  name: "Transfer",
  initialState: "initiated",
  states: {
    initiated: {},
    manager_approval: {},
    hr_approval: {},
    approved: { terminal: true },
    rejected: { terminal: true },
  },
  transitions: {
    submit: { from: "initiated", to: "manager_approval" },
    manager_approve: { from: "manager_approval", to: "hr_approval" },
    hr_approve: { from: "hr_approval", to: "approved" },
    reject: { from: ["manager_approval", "hr_approval"], to: "rejected" },
  },
};

