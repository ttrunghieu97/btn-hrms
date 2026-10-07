export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'skipped' | 'draft';

export interface WorkflowActor {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface WorkflowTimelineItem {
  id: string;
  /** The action performed (e.g. "Submitted", "Approved", "Requested change") */
  action: string;
  /** Current status of this step */
  status: WorkflowStatus;
  /** ISO timestamp */
  timestamp: string;
  /** Who performed the action */
  actor?: WorkflowActor;
  /** Optional comment/notes */
  comment?: string;
  /** Domain-agnostic metadata bag */
  metadata?: Record<string, unknown>;
}

export interface WorkflowMetadata {
  requestId?: string;
  policyName?: string;
  stepIndex?: number;
  totalSteps?: number;
  subjectType?: string;
  subjectId?: string;
}
