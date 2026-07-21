/**
 * Generic workflow definition DSL.
 * Workflows define orchestration. Use cases define business logic.
 * Engine only moves state.
 */

export interface WorkflowGuard {
  type: "expression";
  expression: string;
}

export interface WorkflowAction {
  type: "usecase" | "event" | "side-effect";
  handler: string;
  /** Optional payload mapping — transferred to action context */
  payload?: Record<string, string>;
}

export interface WorkflowTransition {
  event: string;
  target: string;
  guard?: WorkflowGuard;
  actions?: WorkflowAction[];
}

export interface WorkflowState {
  onEnter?: WorkflowAction[];
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition {
  id: string;
  version: number;
  name: string;
  initialState: string;
  states: Record<string, WorkflowState>;
}

export function createDefinition(def: WorkflowDefinition): WorkflowDefinition {
  // Validate: every state must exist as a key in states
  for (const [stateName, state] of Object.entries(def.states)) {
    for (const trans of state.transitions) {
      if (!def.states[trans.target] && !trans.target.startsWith("terminal_")) {
        throw new Error(
          `Workflow "${def.id}" v${def.version}: state "${stateName}" ` +
          `has transition to unknown target "${trans.target}"`,
        );
      }
    }
  }
  return def;
}
