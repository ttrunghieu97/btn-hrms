import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  WorkflowAction,
  WorkflowActor,
} from './types';

interface WorkflowConfig {
  id: string;
  name: string;
  entity: string;
  description: string;
  apiBaseUrl: string;
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  actions: WorkflowAction[];
}

export function createWorkflow(config: WorkflowConfig): WorkflowDefinition {
  const {
    id,
    name,
    entity,
    description,
    apiBaseUrl,
    initialState,
    states,
    transitions,
    actions,
  } = config;

  const stateMap = new Map<string, WorkflowState>();
  states.forEach((s) => stateMap.set(s.key, s));

  const actionMap = new Map<string, WorkflowAction>();
  actions.forEach((a) => actionMap.set(a.id, a));

  return {
    id,
    name,
    entity,
    description,
    apiBaseUrl,
    initialState,
    states,
    transitions,

    getState(key: string): WorkflowState | undefined {
      return stateMap.get(key);
    },

    getAvailableActions(currentState: string): WorkflowAction[] {
      const allowedTransitions = transitions.filter((t) => t.from === currentState);
      const allowedActionIds = new Set(allowedTransitions.map((t) => t.actionId));
      return actions.filter((a) => allowedActionIds.has(a.id));
    },

    getNextActor(currentState: string): WorkflowActor | null {
      const state = stateMap.get(currentState);
      return state ? state.responsibleActor : null;
    },

    getActionGuidance(currentState: string): string {
      const state = stateMap.get(currentState);
      return state?.actionGuidance || 'Theo dõi tiến trình xử lý nghiệp vụ.';
    },

    getResultPreview(currentState: string): string {
      const state = stateMap.get(currentState);
      return state?.resultPreview || '';
    },
  };
}
