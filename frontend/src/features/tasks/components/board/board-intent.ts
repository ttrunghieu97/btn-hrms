/**
 * Transition Intent — pure data type representing a user's intent
 * to transition a task from one state to another.
 *
 * The Board emits intents. The system executes them via the machine.
 * Board never sets state directly — only emits intents.
 */

import type { Task } from '../../utils/task-types';
import { canTransition, type TaskAction, type TaskActor, type TaskState } from '../../workflow/machine';
import { getActionUiConfig } from '../workflow/workflow-ui';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface TransitionIntent {
  /** The task being transitioned. */
  taskId: string;
  /** Current state snapshot for validation. */
  fromState: TaskState;
  /** The action the user wants to perform. */
  action: TaskAction;
  /** Derived target state from the machine. */
  toState: TaskState;
  /** Extra metadata needed by this action type. */
  metadata?: TransitionIntentMetadata;
}

export interface TransitionIntentMetadata {
  reason?: string;
  resultText?: string;
  assigneeId?: string;
}

export type IntentResult =
  | { ok: true; intent: TransitionIntent }
  | { ok: false; reason: string };

/* ------------------------------------------------------------------ */
/* Intent factory                                                       */
/* ------------------------------------------------------------------ */

/**
 * Derive the action implied by moving a task to a target column.
 *
 * This is the key mapping: drag-to-column → transition action.
 * Currently uses best-guess mapping. In production the machine
 * may return a short-list of possible actions per state, and
 * the UI picks the matching one based on target state.
 */
function inferAction(from: TaskState, to: TaskState): TaskAction | null {
  switch (`${from}->${to}`) {
    case 'created->assigned': return 'assign';
    case 'assigned->in_progress': return 'accept';
    case 'assigned->created': return 'unassign';
    case 'in_progress->submitted': return 'submit';
    case 'in_progress->assigned': return 'assign';
    case 'submitted->completed': return 'approve';
    case 'submitted->revision': return 'request_revision';
    case 'revision->submitted': return 'resubmit';
    default: return null;
  }
}

/**
 * Create a transition intent from a board drag action.
 * Pure function — validates against the machine before returning.
 */
export function createBoardIntent(
  task: Task,
  targetState: TaskState,
  actor: TaskActor,
  metadata?: TransitionIntentMetadata,
): IntentResult {
  const fromState = task.status as TaskState;
  if (!fromState) {
    return { ok: false, reason: `Task "${task.id}" has no valid status` };
  }

  const action = inferAction(fromState, targetState);
  if (!action) {
    return { ok: false, reason: `No transition from "${fromState}" to "${targetState}"` };
  }

  // Validate against machine
  const guard = canTransition(
    { state: fromState, createdById: '', assigneeId: null },
    action,
    actor,
  );
  if (!guard.ok) {
    return { ok: false, reason: guard.reason };
  }

  // Check metadata requirements from UI config
  const uiConfig = getActionUiConfig(action);
  if (uiConfig.dialogType === 'reason' && !metadata?.reason) {
    return { ok: false, reason: `"${uiConfig.label}" requires a reason` };
  }
  if (uiConfig.dialogType === 'result' && !metadata?.resultText) {
    return { ok: false, reason: `"${uiConfig.label}" requires a result` };
  }
  if (uiConfig.dialogType === 'assign' && !metadata?.assigneeId) {
    return { ok: false, reason: `"${uiConfig.label}" requires an assignee` };
  }

  return {
    ok: true,
    intent: {
      taskId: task.id,
      fromState,
      action,
      toState: targetState,
      metadata,
    },
  };
}

/**
 * Board-given intent → API payload shape (for the transition mutation).
 */
export function intentToApiPayload(intent: TransitionIntent): {
  transition: string;
  reason?: string;
  resultText?: string;
  assigneeId?: string;
} {
  return {
    transition: intent.action,
    ...(intent.metadata?.reason && { reason: intent.metadata.reason }),
    ...(intent.metadata?.resultText && { resultText: intent.metadata.resultText }),
    ...(intent.metadata?.assigneeId && { assigneeId: intent.metadata.assigneeId }),
  };
}
