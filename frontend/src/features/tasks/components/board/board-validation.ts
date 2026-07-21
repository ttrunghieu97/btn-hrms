/**
 * Task board invariant checks.
 *
 * Validates that the board state is consistent with the workflow machine.
 * Pure functions — no side effects, no UI.
 *
 * Use in development / test only.
 * In production these run once and warn on mismatch.
 */

import type { Task } from '../../utils/task-types';
import { taskMachine, TASK_STATES, type TaskState } from '../../workflow/machine';

export interface BoardInvariantIssue {
  severity: 'error' | 'warn';
  message: string;
  taskId?: string;
  currentState?: string;
  expected?: string;
}

/* ------------------------------------------------------------------ */
/* Invariant checks                                                     */
/* ------------------------------------------------------------------ */

/**
 * Check that every task's status is a known machine state.
 * Unknown states will be silently dropped by groupTasksByState,
 * so this catch them early.
 */
export function checkUnknownStates(tasks: readonly Task[]): BoardInvariantIssue[] {
  const known = new Set<string>(TASK_STATES);
  return tasks
    .filter((t) => !known.has(t.status ?? ''))
    .map((t) => ({
      severity: 'error' as const,
      message: `Task "${t.id}" has unknown status "${t.status}". Not a workflow state.`,
      taskId: t.id,
      currentState: t.status,
    }));
}

/**
 * Check that no task is in a state that has no incoming transitions
 * (orphan state — task was set manually outside the workflow).
 */
export function checkOrphanStates(tasks: readonly Task[]): BoardInvariantIssue[] {
  const reachable = new Set<string>();

  // 'created' is the initial state, always reachable
  reachable.add('created');

  // Mark all target states from the machine as reachable
  for (const from of taskMachine.getAllStates()) {
    for (const action of taskMachine.getAvailableActions(from)) {
      const next = taskMachine.getNextState(from, action);
      if (next) reachable.add(next);
    }
  }

  return tasks
    .filter((t) => t.status && !reachable.has(t.status))
    .map((t) => ({
      severity: 'warn' as const,
      message: `Task "${t.id}" in state "${t.status}" — no transition leads to this state. Manual override?`,
      taskId: t.id,
      currentState: t.status,
    }));
}

/**
 * Check that completed tasks have no assignee (expected invariant).
 */
export function checkCompletedAssignee(tasks: readonly Task[]): BoardInvariantIssue[] {
  return tasks
    .filter((t) => t.status === 'completed' && t.assignee)
    .map((t) => ({
      severity: 'warn' as const,
      message: `Completed task "${t.id}" still has an assignee. Should be unassigned.`,
      taskId: t.id,
    }));
}

/**
 * Run all invariant checks.
 */
export function validateBoard(tasks: readonly Task[]): BoardInvariantIssue[] {
  return [
    ...checkUnknownStates(tasks),
    ...checkOrphanStates(tasks),
    ...checkCompletedAssignee(tasks),
  ];
}

/* ------------------------------------------------------------------ */
/* Diagnostics summary (dev-only)                                       */
/* ------------------------------------------------------------------ */

export interface BoardDiagnostics {
  totalTasks: number;
  stateDistribution: Record<string, number>;
  issues: BoardInvariantIssue[];
  healthy: boolean;
}

export function diagnoseBoard(tasks: readonly Task[]): BoardDiagnostics {
  const distribution: Record<string, number> = {};
  for (const t of tasks) {
    const s = t.status ?? 'unknown';
    distribution[s] = (distribution[s] ?? 0) + 1;
  }

  const issues = validateBoard(tasks);

  return {
    totalTasks: tasks.length,
    stateDistribution: distribution,
    issues,
    healthy: issues.length === 0,
  };
}
