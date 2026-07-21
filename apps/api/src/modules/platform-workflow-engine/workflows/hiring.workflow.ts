import { type WorkflowDefinitionConfig } from "./types";

export const HIRING_WORKFLOW: WorkflowDefinitionConfig = {
  key: "hiring",
  version: 1,
  name: "Hiring",
  initialState: "opened",
  states: {
    opened: {},
    screening: {},
    interview: {},
    offer: {},
    hired: { terminal: true },
    rejected: { terminal: true },
  },
  transitions: {
    start_screening: { from: "opened", to: "screening" },
    schedule_interview: { from: "screening", to: "interview" },
    make_offer: { from: "interview", to: "offer" },
    hire: { from: ["offer", "interview"], to: "hired" },
    reject: { from: ["opened", "screening", "interview", "offer"], to: "rejected" },
  },
};

