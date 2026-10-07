/**
 * Task board read model.
 *
 * Derives columns from the workflow state machine.
 * Pure functions — zero UI logic, zero side effects.
 *
 * CONTAINS NO DRAG OR MUTATION LOGIC.
 * That comes in Step 2C (transition bridge).
 */

import type { Task } from '../../utils/task-types';
import { TASK_STATES, type TaskState } from '../../workflow/machine';

export type TaskGroupedMap = ReadonlyMap<TaskState, readonly Task[]>;

/**
 * Group tasks by their state into a Map.
 * Unrecognised states are discarded (they are not workflow states).
 *
 * The iteration order follows TASK_STATES (machine's dependency order).
 */
export function groupTasksByState(tasks: readonly Task[]): TaskGroupedMap {
  const map = new Map<TaskState, Task[]>();
  for (const state of TASK_STATES) map.set(state, []);
  for (const task of tasks) {
    // Only include states the machine knows about
    if (map.has(task.status as TaskState)) {
      map.get(task.status as TaskState)!.push(task);
    }
  }
  return map;
}

/**
 * Flatten a grouped map back into a single array (for filtering/search count).
 */
export function flattenGrouped(map: TaskGroupedMap): Task[] {
  return Array.from(map.values()).flat();
}
