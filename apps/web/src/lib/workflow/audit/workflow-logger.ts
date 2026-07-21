/**
 * Workflow-specific structured logger.
 *
 * Wraps appLogger with workflow context for consistent
 * observability across all domains (Task, Leave, Attendance).
 *
 * In production, these logs feed into the monitoring pipeline.
 */

import { appLogger } from '@/lib/logger';

type WorkflowLogMeta = {
  domain: string;
  entityId: string;
  action?: string;
  fromState?: string;
  toState?: string;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  /** If the transition was blocked, why */
  guardResult?: string;
  [key: string]: unknown;
};

export const workflowLogger = {
  transitionAttempt(meta: WorkflowLogMeta): void {
    appLogger.info('workflow_transition_attempt', meta);
  },

  transitionSuccess(meta: WorkflowLogMeta): void {
    appLogger.info('workflow_transition_success', meta);
  },

  transitionFailed(meta: WorkflowLogMeta & { error?: string }): void {
    appLogger.warn('workflow_transition_failed', meta);
  },

  guardDenied(meta: WorkflowLogMeta & { reason: string }): void {
    appLogger.warn('workflow_guard_denied', meta);
  },

  invalidAction(meta: WorkflowLogMeta & { reason: string }): void {
    appLogger.warn('workflow_invalid_action', meta);
  },

  /**
   * Log an unexpected state (e.g. board validation detected
   * an orphan state or unknown status). Non-blocking.
   */
  stateAnomaly(meta: WorkflowLogMeta & { anomaly: string }): void {
    appLogger.warn('workflow_state_anomaly', meta);
  },
};
