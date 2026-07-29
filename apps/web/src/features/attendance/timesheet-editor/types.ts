const WS_URL = '/api/v1/timekeeping/timesheet-workspace';

export interface TimesheetWorkspaceEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
}

export interface TimesheetWorkspaceRecord {
  employeeId: string;
  workDate: string;
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number | null;
  scheduledMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null;
  isHoliday: boolean | null;
}

export interface TimesheetWorkspaceResponse {
  period: string;
  periodStatus: PeriodStatus;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
}

export type PeriodStatus = 'open' | 'in_review' | 'locked' | 'payroll_processing' | 'payroll_posted' | 'closed';

export interface PeriodLockData {
  id: string;
  period: string;
  status: PeriodStatus;
  lockedByUserId: string | null;
  lockedAt: string | null;
  unlockedByUserId: string | null;
  unlockedAt: string | null;
  remarks: string | null;
}

export interface DirtyCell {
  checkIn: string;
  checkOut: string;
}

export interface FailedCell {
  employeeId: string;
  workDate: string;
  reason: string;
}

export interface BatchRecord {
  employeeId: string;
  workDate: string;
  checkIn: string;
  checkOut: string;
}

export interface BatchSavePayload {
  period: string;
  records: BatchRecord[];
}

export interface BatchSaveResponse {
  success: number;
  failed: number;
  errors: FailedCell[];
}

// ─── Utility ──────────────────────────────────────────────────────────

export function periodFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}

export function cellKey(employeeId: string, workDate: string): string {
  return `${employeeId}::${workDate}`;
}
