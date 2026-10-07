/* ------------------------------------------------------------------ */
/* Timekeeping pure utility helpers                                   */
/*                                                                     */
/* ALL functions are 100% pure — no hooks, no queries, no cache.      */
/* Extracted from inline component definitions for reuse & testability.*/
/* ------------------------------------------------------------------ */

// Badge variant union — kept local so consumers don't need UI imports.
type Variant = 'default' | 'destructive' | 'secondary' | 'outline';

/** Format minutes → "4h30p" or "4h" or "30p" or "--". */
export function formatMinutes(m: number | null | undefined): string {
  if (m == null) return '--';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${min > 0 ? min + 'p' : ''}`;
}

/* ── Attendance-outcome helpers ──────────────────────────────────── */

const OUTCOME_LABELS: Record<string, string> = {
  present: 'Có mặt',
  absent: 'Vắng mặt',
  leave: 'Nghỉ phép',
  holiday: 'Ngày lễ',
  off: 'Nghỉ',
  blocked: 'Bị khóa',
};

export function getOutcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? (outcome || '--');
}

const OUTCOME_BADGE_VARIANTS: Record<string, Variant> = {
  present: 'default',
  absent: 'destructive',
  leave: 'secondary',
  holiday: 'secondary',
  off: 'outline',
  blocked: 'destructive',
};

export function getOutcomeBadgeVariant(outcome: string): Variant {
  return OUTCOME_BADGE_VARIANTS[outcome] ?? 'outline';
}

/* ── Exception-state helpers ─────────────────────────────────────── */

const EXCEPTION_STATE_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  resolved: 'Đã xử lý',
  closed: 'Đã đóng',
};

export function getExceptionStateLabel(state: string): string {
  return EXCEPTION_STATE_LABELS[state] ?? '';
}

const EXCEPTION_STATE_BADGE_VARIANTS: Record<string, Variant> = {
  pending: 'destructive',
  resolved: 'default',
  closed: 'secondary',
};

export function getExceptionStateBadgeVariant(state: string): Variant {
  return EXCEPTION_STATE_BADGE_VARIANTS[state] ?? 'outline';
}

/* ── Adjustment-type helper ──────────────────────────────────────── */

import { attendanceUiCopy } from '@/lib/app-copy';

export function getAdjustmentTypeLabel(type: string): string {
  if (type === 'check_in') return attendanceUiCopy.timekeeping.adjustTable.checkIn;
  if (type === 'check_out') return attendanceUiCopy.timekeeping.adjustTable.checkOut;
  return type;
}
