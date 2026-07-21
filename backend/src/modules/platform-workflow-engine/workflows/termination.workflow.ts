import { type WorkflowDefinitionConfig } from "./types";

export const TERMINATION_WORKFLOW: WorkflowDefinitionConfig = {
  key: "employee_termination",
  version: 1,
  name: "Employee Termination",
  initialState: "scheduled",
  states: {
    scheduled: {},
    executed: { terminal: true },
    cancelled: { terminal: true },
  },
  transitions: {
    schedule: { from: [], to: "scheduled" },
    execute: { from: "scheduled", to: "executed" },
    cancel: { from: "scheduled", to: "cancelled" },
  },
};
