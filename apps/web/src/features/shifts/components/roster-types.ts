import type { ShiftRosterRow, ShiftTemplateRow } from '../api/queries';

export type RosterCellCategory = 'DAY' | 'NIGHT' | 'SPLIT' | 'OFF';
export type RosterWarningSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type RosterWarningType = 'REST_PERIOD' | 'OVERTIME' | 'LEAVE_CONFLICT' | 'UNASSIGNED_COVERAGE';

export interface RosterCellWarning {
  type: RosterWarningType;
  severity: RosterWarningSeverity;
  message: string;
}

export interface RosterCellState {
  employeeId: string;
  date: string;
  /** @deprecated Use `assignments` instead */
  assignment?: ShiftRosterRow;
  /** All assignments for this employee+date, sorted by startTime */
  assignments: ShiftRosterRow[];
  category: RosterCellCategory;
  warnings: RosterCellWarning[];
  isLocked: boolean;
}

/**
 * Determines shift category based on start & end time or overnight flag.
 */
export function getShiftCategory(row?: ShiftRosterRow): RosterCellCategory {
  if (!row) return 'OFF';
  if (row.overnight) return 'NIGHT';

  const startHour = parseInt(row.startTime.split(':')[0] ?? '0', 10);
  if (startHour >= 18 || startHour < 5) return 'NIGHT';
  return 'DAY';
}

/**
 * Sort roster rows by startTime ascending.
 */
export function sortByStartTime(rows: ShiftRosterRow[]): ShiftRosterRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.startTime || '99:99';
    const tb = b.startTime || '99:99';
    return ta.localeCompare(tb);
  });
}
