export interface WorkflowInstance {
  id: string;
  workflowId: string;
  version: number;
  subjectId: string;
  subjectType?: string;
  currentState: string;
  context: Record<string, unknown>;
  status: "active" | "completed" | "cancelled" | "failed";
}

export interface WorkflowTransitionRecord {
  instanceId: string;
  fromState: string | null;
  toState: string;
  transition: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
}
