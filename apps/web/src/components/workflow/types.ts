/**
 * Core type definitions for HRMS Frontend Workflow UI components.
 */

export interface WorkflowActor {
  role: string;
  label: string;
  description?: string;
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
