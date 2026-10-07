import { type WorkflowDefinitionConfig } from "./types";

export const PERFORMANCE_WORKFLOW: WorkflowDefinitionConfig = {
  key: "performance_review",
  version: 1,
  name: "Performance Review",
  initialState: "created",
  states: {
    created: {},
    self_assessment: {},
    manager_review: {},
    calibrated: {},
    completed: { terminal: true },
  },
  transitions: {
    request_self_assessment: { from: "created", to: "self_assessment" },
    submit_self_assessment: { from: "self_assessment", to: "manager_review" },
    calibrate: { from: "manager_review", to: "calibrated" },
    complete: { from: ["calibrated", "manager_review"], to: "completed" },
  },
};

