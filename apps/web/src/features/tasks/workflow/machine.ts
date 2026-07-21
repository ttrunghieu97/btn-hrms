/**
 * Task workflow engine.
 *
 * Thin domain layer over the generic workflow engine (lib/workflow/machine.ts).
 *
 * Exists as the single abstraction boundary between Task domain
 * and the generic engine core. If the engine proves insufficient,
 * changes happen HERE before reaching lib/workflow.
 */

import { createMachine, type WorkflowSnapshot, type WorkflowActor, type WorkflowTransitionDef } from '@/lib/workflow/machine';
import { TransitionTaskDtoTransition } from '@/api/generated/model';

/* ------------------------------------------------------------------ */
/* Domain-specific types (re-exported for convenience)                  */
/* ------------------------------------------------------------------ */

export type TaskState = string;
export type TaskAction = keyof typeof TransitionTaskDtoTransition;

export interface TaskSnapshot extends WorkflowSnapshot {
  state: TaskState;
  createdById: string;
  assigneeId: string | null;
}

export interface TaskActor extends WorkflowActor {}

/* ------------------------------------------------------------------ */
/* Task transition definitions (source of truth)                        */
/* ------------------------------------------------------------------ */

const TASK_TRANSITION_DEFS = [
  // created → assigned (creator/manager assigns someone)
  { from: 'created', action: 'assign' as TaskAction, to: 'assigned', allowedRoles: ['creator', 'manager', 'admin'] },
  // created → cancelled (creator cancels before assignment)
  { from: 'created', action: 'cancel' as TaskAction, to: 'cancelled', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },

  // assigned → in_progress (assignee accepts)
  { from: 'assigned', action: 'accept' as TaskAction, to: 'in_progress', allowedRoles: ['assignee'] },
  // assigned → assigned (re-assign)
  { from: 'assigned', action: 'assign' as TaskAction, to: 'assigned', allowedRoles: ['manager', 'admin'] },
  // assigned → declined (assignee rejects)
  { from: 'assigned', action: 'reject' as TaskAction, to: 'declined', allowedRoles: ['assignee'], requiresReason: true },
  // assigned → cancelled (creator/manager cancels)
  { from: 'assigned', action: 'cancel' as TaskAction, to: 'cancelled', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },
  // assigned → created (unassign)
  { from: 'assigned', action: 'unassign' as TaskAction, to: 'created', allowedRoles: ['manager', 'admin'] },

  // in_progress → submitted (assignee submits result)
  { from: 'in_progress', action: 'submit' as TaskAction, to: 'submitted', allowedRoles: ['assignee'], requiresResult: true },
  // in_progress → in_progress (re-assign while in progress)
  { from: 'in_progress', action: 'assign' as TaskAction, to: 'in_progress', allowedRoles: ['manager', 'admin'] },
  // in_progress → cancelled (creator/manager cancels mid-work)
  { from: 'in_progress', action: 'cancel' as TaskAction, to: 'cancelled', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },

  // submitted → completed (reviewer approves)
  { from: 'submitted', action: 'approve' as TaskAction, to: 'completed', allowedRoles: ['creator', 'manager', 'admin'] },
  // submitted → revision (reviewer requests revision)
  { from: 'submitted', action: 'request_revision' as TaskAction, to: 'revision', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },
  // submitted → cancelled (reviewer cancels)
  { from: 'submitted', action: 'cancel' as TaskAction, to: 'cancelled', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },

  // revision → submitted (assignee resubmits)
  { from: 'revision', action: 'resubmit' as TaskAction, to: 'submitted', allowedRoles: ['assignee'], requiresResult: true },
  // revision → cancelled (creator/manager gives up)
  { from: 'revision', action: 'cancel' as TaskAction, to: 'cancelled', allowedRoles: ['creator', 'manager', 'admin'], requiresReason: true },
] as const;

/* ------------------------------------------------------------------ */
/* Machine instance                                                     */
/* ------------------------------------------------------------------ */

export const taskMachine = createMachine(TASK_TRANSITION_DEFS);

/* ------------------------------------------------------------------ */
/* Re-exported helpers for convenience (delegate to generic machine)    */
/* ------------------------------------------------------------------ */

/** Ordered states for board columns. */
export const TASK_STATES: TaskState[] = [
  'created', 'assigned', 'in_progress', 'submitted', 'revision', 'declined', 'completed', 'cancelled',
];

export function findTransition(from: TaskState, action: TaskAction) {
  return taskMachine.find(from, action);
}

export function getAvailableActions(state: TaskState) {
  return taskMachine.getAvailableActions(state);
}

export function getNextState(from: TaskState, action: TaskAction) {
  return taskMachine.getNextState(from, action);
}

export function canTransition(snapshot: TaskSnapshot, action: TaskAction, actor: TaskActor) {
  return taskMachine.canTransition(snapshot, action, actor);
}

export function transition(snapshot: TaskSnapshot, action: TaskAction, actor: TaskActor) {
  return taskMachine.canTransition(snapshot, action, actor);
}
