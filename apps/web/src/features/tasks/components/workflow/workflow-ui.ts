/**
 * Task workflow UI mapping layer.
 *
 * Maps pure machine types (TaskAction) to presentation config.
 *
 * CONTAINS ZERO STATE MACHINE LOGIC.
 * This file only answers: "given this action, what does the UI look like?"
 *
 * If a second workflow type appears (e.g. Leave), create its own
 * workflow-ui.ts in that feature — NOT shared abstraction.
 */

import { taskUiCopy } from '@/lib/app-copy';
import { TransitionTaskDtoTransition } from '@/api/generated/model';
import { appLogger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ActionDialogType = 'direct' | 'reason' | 'result' | 'assign';

export interface ActionUiConfig {
  /** i18n label for the action button. */
  label: string;
  /** Button variant. */
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  /** What kind of dialog (if any) this action triggers. */
  dialogType: ActionDialogType;
  /** Icon name from Icons map. */
  icon?: string;
}

/* ------------------------------------------------------------------ */
/* Action → UI config — single source of truth for presentation        */
/* ------------------------------------------------------------------ */

export const TRANSITION_UI_CONFIG: Record<string, ActionUiConfig> = {
  [TransitionTaskDtoTransition.assign]: {
    label: taskUiCopy.transitions.assign,
    variant: 'secondary',
    dialogType: 'assign',
    icon: 'userPen',
  },
  [TransitionTaskDtoTransition.unassign]: {
    label: taskUiCopy.transitions.unassign,
    variant: 'outline',
    dialogType: 'direct',
    icon: 'userX',
  },
  [TransitionTaskDtoTransition.accept]: {
    label: taskUiCopy.transitions.accept,
    variant: 'default',
    dialogType: 'direct',
    icon: 'check',
  },
  [TransitionTaskDtoTransition.reject]: {
    label: taskUiCopy.transitions.reject,
    variant: 'destructive',
    dialogType: 'reason',
    icon: 'xCircle',
  },
  [TransitionTaskDtoTransition.submit]: {
    label: taskUiCopy.transitions.submit,
    variant: 'default',
    dialogType: 'result',
    icon: 'send',
  },
  [TransitionTaskDtoTransition.resubmit]: {
    label: taskUiCopy.transitions.resubmit,
    variant: 'default',
    dialogType: 'result',
    icon: 'refresh',
  },
  [TransitionTaskDtoTransition.approve]: {
    label: taskUiCopy.transitions.approve,
    variant: 'default',
    dialogType: 'direct',
    icon: 'circleCheck',
  },
  [TransitionTaskDtoTransition.request_revision]: {
    label: taskUiCopy.transitions.requestRevision,
    variant: 'outline',
    dialogType: 'reason',
    icon: 'edit',
  },
  [TransitionTaskDtoTransition.cancel]: {
    label: taskUiCopy.transitions.cancel,
    variant: 'destructive',
    dialogType: 'reason',
    icon: 'close',
  },
};

/** Fallback for unknown transitions (BE may add new ones). */
export function getActionUiConfig(action: string): ActionUiConfig {
  const config = TRANSITION_UI_CONFIG[action];
  if (config) return config;

  appLogger.warn('task_workflow_unknown_action', { action });
  return {
    label: action === 'unknown_action' ? 'Không xác định' : action,
    variant: 'outline' as const,
    dialogType: 'direct' as const,
  };
}
