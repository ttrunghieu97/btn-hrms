/**
 * Core type definitions for the HRMS Frontend Workflow Engine & Registry.
 *
 * Grounded in backend NestJS domain state machines and UseCases.
 */

export interface WorkflowActor {
  role: string;
  label: string;
  description?: string;
}

export interface WorkflowAction {
  id: string;
  label: string;
  targetState: string;
  actor: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  isDestructive?: boolean;
  resultPreview?: string;
  blockingConditions?: string[];
}

export interface WorkflowState {
  key: string;
  label: string;
  stepNumber: number;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'emerald' | 'blue';
  description?: string;
  responsibleActor: WorkflowActor;
  actionGuidance: string;
  resultPreview?: string;
  isTerminal?: boolean;
  isFailure?: boolean;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  actionId: string;
  label: string;
  actor: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  entity: string;
  description: string;
  apiBaseUrl: string;
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  getState(key: string): WorkflowState | undefined;
  getAvailableActions(currentState: string): WorkflowAction[];
  getNextActor(currentState: string): WorkflowActor | null;
  getActionGuidance(currentState: string): string;
  getResultPreview(currentState: string): string;
}
