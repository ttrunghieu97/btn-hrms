/**
 * Allowed employee status transitions.
 * Key = current status, value = array of allowed target statuses.
 */
export const EMPLOYEE_STATUS_TRANSITIONS: Record<string, string[]> = {
  probation: ["working", "terminated"],
  working: ["leave", "suspended", "retired", "terminated"],
  leave: ["working", "terminated"],
  suspended: ["working", "terminated"],
  retired: [],
};

/**
 * Returns allowed target statuses for a given current status.
 */
export function getAllowedTransitions(status: string): string[] {
  return EMPLOYEE_STATUS_TRANSITIONS[status] ?? [];
}
