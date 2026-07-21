import { type WorkflowDefinitionConfig } from "./types";

export const LEAVE_APPROVAL_WORKFLOW: WorkflowDefinitionConfig = {
  key: "leave_approval",
  version: 1,
  name: "Leave Approval",
  initialState: "requested",
  states: {
    requested: {},
    manager_review: {},
    hr_review: {},
    approved: { terminal: true },
    rejected: { terminal: true },
    cancelled: { terminal: true },
  },
  transitions: {
    submit: { from: "requested", to: "manager_review" },
    manager_approve: { from: "manager_review", to: "hr_review" },
    hr_approve: { from: "hr_review", to: "approved" },
    reject: { from: ["manager_review", "hr_review"], to: "rejected" },
    cancel: { from: ["requested", "manager_review", "hr_review"], to: "cancelled" },
  },
};

