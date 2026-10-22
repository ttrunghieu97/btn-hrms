export interface TimesheetWorkspaceEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  jobTitle?: string | null;
  baseSalary?: number | null;
  responsibilityAllowance?: number | null;
  workingDays: number;
  totalDays: number;
  completionRate: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  otMinutes: number;
  workedMinutes: number;
  verificationStatus: 'draft' | 'done';
}

export interface TimesheetWorkspacePeriodTotals {
  totalEmployees: number; completedEmployees: number; inProgressEmployees: number; notStartedEmployees: number;
  totalWorkedMinutes: number; totalOtMinutes: number; totalLateCount: number; totalLeaveCount: number;
}

export interface TimesheetWorkspaceResponse {
  period: string; periodStatus: PeriodStatus;
  availableActions: string[];
  totals: TimesheetWorkspacePeriodTotals;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
}

export interface TimesheetWorkspaceRecord {
  employeeId: string;
  workDate: string;
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  checkInMorning?: string | null;
  checkOutMorning?: string | null;
  checkInAfternoon?: string | null;
  checkOutAfternoon?: string | null;
  note?: string | null;
  workedMinutes: number | null;
  scheduledMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null;
  personalBreakMinutes: number | null;
  lunchDutyMinutes: number | null;
  breakMinutes?: number | null;
  duty30kMinutes?: number | null;
  nightShiftDutyCount: number | null;
  waterBoothDutyCount: number | null;
  isHoliday: boolean | null;
}

export type PeriodStatus = 'open' | 'in_review' | 'locked' | 'payroll_processing' | 'payroll_posted' | 'closed';

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
