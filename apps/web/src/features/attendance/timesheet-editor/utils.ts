import type { TimesheetWorkspaceRecord } from './types';

/** Find a single employee's daily record by work date. */
export function getRecord(
  records: TimesheetWorkspaceRecord[],
  employeeId: string,
  workDate: string,
): TimesheetWorkspaceRecord | undefined {
  return records.find((r) => r.employeeId === employeeId && r.workDate === workDate);
}
