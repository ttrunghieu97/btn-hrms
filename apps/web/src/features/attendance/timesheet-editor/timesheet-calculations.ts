import type { StatusMap } from '@/components/ui/status-badge';
import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from './types';
import { fmtDuration, fmtTime, fmtWork } from './detail-columns';

export const statusMap: StatusMap = {
  verified: {
    label: 'Đã chốt',
    variant: 'outline',
    className:
      'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0 font-medium',
  },
  unverified: {
    label: 'Chưa chốt',
    variant: 'outline',
    className:
      'border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0 font-medium',
  },
  bad: {
    label: 'Chưa chấm công',
    variant: 'outline',
    className: 'border-border/80 text-muted-foreground bg-muted/50 text-[10px] px-1.5 py-0 font-medium',
  },
};

export function employeeStatus(
  emp: TimesheetWorkspaceEmployee,
  vMap?: Record<string, 'draft' | 'done'>,
): 'verified' | 'unverified' | 'bad' {
  const currentStatus = vMap?.[emp.id] ?? emp.verificationStatus;
  if (currentStatus === 'done') return 'verified';
  if (emp.workingDays === 0) return 'bad';
  return 'unverified';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

export type EditableField =
  | 'checkInMorning'
  | 'checkOutMorning'
  | 'checkInAfternoon'
  | 'checkOutAfternoon'
  | 'breakHours'
  | 'personalBreakHours'
  | 'lunchDutyHours'
  | 'duty30kHours'
  | 'nightShift'
  | 'waterBooth'
  | 'note';

export const ORDERED_FIELDS: EditableField[] = [
  'checkInMorning',
  'checkOutMorning',
  'checkInAfternoon',
  'checkOutAfternoon',
  'breakHours',
  'personalBreakHours',
  'lunchDutyHours',
  'duty30kHours',
  'nightShift',
  'waterBooth',
  'note',
];

/** Visual column index (0..15) across all 16 data columns of the 18-column grid */
export const VISUAL_COL_BY_FIELD: Record<EditableField, number> = {
  checkInMorning: 0,
  checkOutMorning: 1,
  checkInAfternoon: 2,
  checkOutAfternoon: 3,
  breakHours: 4,
  personalBreakHours: 5,
  lunchDutyHours: 6,
  duty30kHours: 7,
  nightShift: 13,
  waterBooth: 14,
  note: 15,
};

export const FIELD_BY_VISUAL_COL: Record<number, EditableField | undefined> = {
  0: 'checkInMorning',
  1: 'checkOutMorning',
  2: 'checkInAfternoon',
  3: 'checkOutAfternoon',
  4: 'breakHours',
  5: 'personalBreakHours',
  6: 'lunchDutyHours',
  7: 'duty30kHours',
  13: 'nightShift',
  14: 'waterBooth',
  15: 'note',
};

export const FIELD_LABELS: Record<EditableField, string> = {
  checkInMorning: 'Ca sáng · Vào',
  checkOutMorning: 'Ca sáng · Ra',
  checkInAfternoon: 'Ca chiều · Vào',
  checkOutAfternoon: 'Ca chiều · Ra',
  breakHours: 'Nghỉ trưa (giờ)',
  personalBreakHours: 'Việc riêng (giờ)',
  lunchDutyHours: 'Trực trưa 25k (giờ)',
  duty30kHours: 'Trực 35k (giờ)',
  nightShift: 'Trực đêm (lần)',
  waterBooth: 'Đứng nước (lần)',
  note: 'Ghi chú',
};

export interface ActiveCell {
  day: number;
  field: EditableField;
}

export type NavigationDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'next'
  | 'prev'
  | 'enter-down'
  | 'enter-up';

export function getNextCell(
  current: ActiveCell,
  direction: NavigationDirection,
  totalDays: number,
): ActiveCell | null {
  const { day, field } = current;
  const colIdx = ORDERED_FIELDS.indexOf(field);
  if (colIdx < 0) return null;

  if (direction === 'enter-down') {
    if (day < totalDays) return { day: day + 1, field: 'checkInMorning' };
    return null;
  }
  if (direction === 'enter-up') {
    if (day > 1) return { day: day - 1, field: 'checkInMorning' };
    return null;
  }
  if (direction === 'up') {
    if (day > 1) return { day: day - 1, field };
    return null;
  }
  if (direction === 'down') {
    if (day < totalDays) return { day: day + 1, field };
    return null;
  }
  if (direction === 'left') {
    if (colIdx > 0) return { day, field: ORDERED_FIELDS[colIdx - 1]! };
    return null;
  }
  if (direction === 'right') {
    if (colIdx < ORDERED_FIELDS.length - 1) return { day, field: ORDERED_FIELDS[colIdx + 1]! };
    return null;
  }
  if (direction === 'next') {
    if (colIdx < ORDERED_FIELDS.length - 1) {
      return { day, field: ORDERED_FIELDS[colIdx + 1]! };
    }
    if (day < totalDays) {
      return { day: day + 1, field: ORDERED_FIELDS[0]! };
    }
    return null;
  }
  if (direction === 'prev') {
    if (colIdx > 0) {
      return { day, field: ORDERED_FIELDS[colIdx - 1]! };
    }
    if (day > 1) {
      return { day: day - 1, field: ORDERED_FIELDS[ORDERED_FIELDS.length - 1]! };
    }
    return null;
  }
  return null;
}

export function normalizeTimeString(raw: string): string | null {
  const s = raw.trim();
  if (!s || s === '-' || s === '—' || s === '0') return null;
  if (s.includes('T')) {
    const formatted = fmtTime(s);
    return formatted === '-' ? null : formatted;
  }
  if (/^\d{1,2}$/.test(s)) {
    const h = parseInt(s, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    return null;
  }
  if (/^\d{3,4}$/.test(s)) {
    const padded = s.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }
  const colonMatch = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (colonMatch) {
    const h = parseInt(colonMatch[1]!, 10);
    const m = parseInt(colonMatch[2]!, 10);
    const sec = colonMatch[3] !== undefined ? parseInt(colonMatch[3], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && sec >= 0 && sec <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }
  return null;
}

export function calculateWorkedMinutesFromPunches(params: {
  checkInMorning?: string | null;
  checkOutMorning?: string | null;
  checkInAfternoon?: string | null;
  checkOutAfternoon?: string | null;
  personalBreakMinutes?: number | null;
  breakMinutes?: number | null;
  lunchDutyMinutes?: number | null;
  duty30kMinutes?: number | null;
}): number | null {
  const parseMins = (t?: string | null) => {
    if (!t) return null;
    const norm = normalizeTimeString(t);
    if (!norm || !norm.includes(':')) return null;
    const [h, m] = norm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const inM = parseMins(params.checkInMorning);
  const outM = parseMins(params.checkOutMorning);
  const inA = parseMins(params.checkInAfternoon);
  const outA = parseMins(params.checkOutAfternoon);
  const personal = params.personalBreakMinutes || 0;
  const breakMins = params.breakMinutes || 0;
  const lunchDuty = params.lunchDutyMinutes || 0;
  const duty35k = params.duty30kMinutes || 0;

  let total = 0;
  let hasAny = false;

  if (inM != null && outM != null && outM > inM) {
    total += outM - inM;
    hasAny = true;
  }
  if (inA != null && outA != null && outA > inA) {
    total += outA - inA;
    hasAny = true;
  }

  // If user only provided single full day: inM to outA
  if (inM != null && outA != null && outM == null && inA == null && outA > inM) {
    total = outA - inM;
    hasAny = true;
  }

  if (!hasAny) return null;
  return Math.max(0, total - personal - breakMins - lunchDuty - duty35k);
}

const PRESERVED_ZERO_WORK_STATUSES = new Set([
  'leave',
  'holiday',
  'off',
  'weekend',
  'absent_with_permission',
]);

export function resolvePatchedAttendanceStatus(params: {
  explicitStatus?: string;
  currentStatus?: string | null;
  workedMinutes: number;
  isSun?: boolean;
}): string {
  if (params.explicitStatus !== undefined) {
    return params.explicitStatus;
  }
  if (params.workedMinutes > 0) {
    if (params.currentStatus === 'late' || params.currentStatus === 'early_leave') {
      return params.currentStatus;
    }
    return 'present';
  }
  if (params.currentStatus && PRESERVED_ZERO_WORK_STATUSES.has(params.currentStatus)) {
    return params.currentStatus;
  }
  return 'absent';
}

export interface DayCellUpdates {
  workedMinutes?: number;
  overtimeMinutes?: number;
  status?: string;
  note?: string;
  checkInMorning?: string | null;
  checkOutMorning?: string | null;
  checkInAfternoon?: string | null;
  checkOutAfternoon?: string | null;
  breakMinutes?: number | null;
  personalBreakMinutes?: number | null;
  lunchDutyMinutes?: number | null;
  duty30kMinutes?: number | null;
  nightShiftDutyCount?: number | null;
  waterBoothDutyCount?: number | null;
}

export interface DayPatch {
  day: number;
  fields: EditableField[];
  updates: DayCellUpdates;
}

export function normalizeEmployeeRecord(
  r: TimesheetWorkspaceRecord,
): TimesheetWorkspaceRecord {
  const autoWorked = calculateWorkedMinutesFromPunches({
    checkInMorning: r.checkInMorning,
    checkOutMorning: r.checkOutMorning,
    checkInAfternoon: r.checkInAfternoon,
    checkOutAfternoon: r.checkOutAfternoon,
    personalBreakMinutes: r.personalBreakMinutes,
    breakMinutes: r.breakMinutes,
    lunchDutyMinutes: r.lunchDutyMinutes,
    duty30kMinutes: r.duty30kMinutes,
  });
  if (autoWorked !== null && autoWorked !== r.workedMinutes) {
    return {
      ...r,
      workedMinutes: autoWorked,
      overtimeMinutes: autoWorked >= 480 ? autoWorked - 480 : 0,
    };
  }
  return r;
}

export function applyDayPatchToRecord(
  curr: TimesheetWorkspaceRecord | undefined,
  employeeId: string,
  wd: string,
  isSun: boolean,
  updates: DayCellUpdates,
): TimesheetWorkspaceRecord {
  const rawInM =
    updates.checkInMorning !== undefined
      ? updates.checkInMorning
      : (curr?.checkInMorning ?? null);
  const rawOutM =
    updates.checkOutMorning !== undefined ? updates.checkOutMorning : (curr?.checkOutMorning ?? null);
  const rawInA =
    updates.checkInAfternoon !== undefined ? updates.checkInAfternoon : (curr?.checkInAfternoon ?? null);
  const rawOutA =
    updates.checkOutAfternoon !== undefined
      ? updates.checkOutAfternoon
      : (curr?.checkOutAfternoon ?? null);

  const nextInM = rawInM ? normalizeTimeString(rawInM) : null;
  const nextOutM = rawOutM ? normalizeTimeString(rawOutM) : null;
  const nextInA = rawInA ? normalizeTimeString(rawInA) : null;
  const nextOutA = rawOutA ? normalizeTimeString(rawOutA) : null;
  const nextPersonal =
    updates.personalBreakMinutes !== undefined
      ? updates.personalBreakMinutes
      : (curr?.personalBreakMinutes ?? null);
  const nextBreak =
    updates.breakMinutes !== undefined ? updates.breakMinutes : (curr?.breakMinutes ?? null);
  const nextLunch =
    updates.lunchDutyMinutes !== undefined
      ? updates.lunchDutyMinutes
      : (curr?.lunchDutyMinutes ?? null);
  const nextDuty35k =
    updates.duty30kMinutes !== undefined ? updates.duty30kMinutes : (curr?.duty30kMinutes ?? null);

  const hasTimePunchChange =
    updates.checkInMorning !== undefined ||
    updates.checkOutMorning !== undefined ||
    updates.checkInAfternoon !== undefined ||
    updates.checkOutAfternoon !== undefined;

  const autoWorked = calculateWorkedMinutesFromPunches({
    checkInMorning: nextInM,
    checkOutMorning: nextOutM,
    checkInAfternoon: nextInA,
    checkOutAfternoon: nextOutA,
    personalBreakMinutes: nextPersonal,
    breakMinutes: nextBreak,
    lunchDutyMinutes: nextLunch,
    duty30kMinutes: nextDuty35k,
  });

  const nextWorked =
    updates.workedMinutes !== undefined
      ? updates.workedMinutes
      : autoWorked !== null
        ? autoWorked
        : hasTimePunchChange
          ? 0
          : (curr?.workedMinutes ?? 0);

  const nextOt =
    updates.overtimeMinutes !== undefined
      ? updates.overtimeMinutes
      : nextWorked >= 480
        ? nextWorked - 480
        : 0;

  const nextStatus = resolvePatchedAttendanceStatus({
    explicitStatus: updates.status,
    currentStatus: curr?.status,
    workedMinutes: nextWorked,
    isSun,
  });

  return {
    employeeId,
    workDate: wd,
    status: nextStatus,
    checkIn: nextInM ?? nextInA ?? null,
    checkOut: nextOutA ?? nextOutM ?? null,
    checkInMorning: nextInM,
    checkOutMorning: nextOutM,
    checkInAfternoon: nextInA,
    checkOutAfternoon: nextOutA,
    breakMinutes: nextBreak,
    duty30kMinutes: nextDuty35k,
    workedMinutes: nextWorked,
    scheduledMinutes: curr?.scheduledMinutes ?? 480,
    lateMinutes: curr?.lateMinutes ?? 0,
    earlyLeaveMinutes: curr?.earlyLeaveMinutes ?? 0,
    overtimeMinutes: nextOt,
    personalBreakMinutes: nextPersonal,
    lunchDutyMinutes: nextLunch,
    nightShiftDutyCount:
      updates.nightShiftDutyCount !== undefined
        ? updates.nightShiftDutyCount
        : (curr?.nightShiftDutyCount ?? null),
    waterBoothDutyCount:
      updates.waterBoothDutyCount !== undefined
        ? updates.waterBoothDutyCount
        : (curr?.waterBoothDutyCount ?? null),
    isHoliday: curr?.isHoliday ?? false,
    note: updates.note !== undefined ? updates.note : (curr?.note ?? null),
  };
}

export function parseRawCellValueToUpdates(
  field: EditableField,
  rawStr: string,
): DayCellUpdates | null {
  if (
    field === 'checkInMorning' ||
    field === 'checkOutMorning' ||
    field === 'checkInAfternoon' ||
    field === 'checkOutAfternoon'
  ) {
    const trimmed = rawStr.trim();
    if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === '0') {
      return { [field]: null };
    }
    const normalized = normalizeTimeString(trimmed);
    if (!normalized) return null;
    return { [field]: normalized };
  }
  if (field === 'note') {
    return { note: rawStr.trim() };
  }
  const clean = rawStr.replace(',', '.').trim();
  const num = !clean || clean === '-' || clean === '—' ? 0 : parseFloat(clean);
  if (isNaN(num) || num < 0) return null;

  switch (field) {
    case 'breakHours':
      if (num > 24) return null;
      return { breakMinutes: Math.round(num * 60) };
    case 'personalBreakHours':
      if (num > 24) return null;
      return { personalBreakMinutes: Math.round(num * 60) };
    case 'lunchDutyHours':
      if (num > 24) return null;
      return { lunchDutyMinutes: Math.round(num * 60) };
    case 'duty30kHours':
      if (num > 24) return null;
      return { duty30kMinutes: Math.round(num * 60) };
    case 'nightShift':
      if (!Number.isInteger(num) || num > 10) return null;
      return { nightShiftDutyCount: num };
    case 'waterBooth':
      if (!Number.isInteger(num) || num > 10) return null;
      return { waterBoothDutyCount: num };
    default:
      return null;
  }
}

export function getRecordFieldDisplayValue(
  r: TimesheetWorkspaceRecord | undefined,
  field: EditableField,
): string {
  if (!r) return '';
  switch (field) {
    case 'checkInMorning': {
      const t = fmtTime(r.checkInMorning);
      return t === '-' ? '' : t;
    }
    case 'checkOutMorning': {
      const t = fmtTime(r.checkOutMorning);
      return t === '-' ? '' : t;
    }
    case 'checkInAfternoon': {
      const t = fmtTime(r.checkInAfternoon);
      return t === '-' ? '' : t;
    }
    case 'checkOutAfternoon': {
      const t = fmtTime(r.checkOutAfternoon);
      return t === '-' ? '' : t;
    }
    case 'breakHours':
      return r.breakMinutes ? (Number(r.breakMinutes) / 60).toFixed(1) : '';
    case 'personalBreakHours':
      return r.personalBreakMinutes ? (Number(r.personalBreakMinutes) / 60).toFixed(1) : '';
    case 'lunchDutyHours':
      return r.lunchDutyMinutes ? (Number(r.lunchDutyMinutes) / 60).toFixed(1) : '';
    case 'duty30kHours':
      return r.duty30kMinutes ? (Number(r.duty30kMinutes) / 60).toFixed(1) : '';
    case 'nightShift':
      return Number(r.nightShiftDutyCount) > 0 ? String(r.nightShiftDutyCount) : '';
    case 'waterBooth':
      return Number(r.waterBoothDutyCount) > 0 ? String(r.waterBoothDutyCount) : '';
    case 'note':
      return r.note || '';
  }
}

export function getVisualColDisplayValue(
  r: TimesheetWorkspaceRecord | undefined,
  visualCol: number,
): string {
  const editableField = FIELD_BY_VISUAL_COL[visualCol];
  if (editableField) {
    return getRecordFieldDisplayValue(r, editableField);
  }
  const worked = Number(r?.workedMinutes) || 0;
  switch (visualCol) {
    case 8:
      return worked > 0 ? String(Math.floor(worked / 60)) : '';
    case 9:
      return worked > 0 ? String(worked % 60).padStart(2, '0') : '';
    case 10: {
      const w = fmtWork(worked);
      return w === '—' || w === '-' ? '' : w;
    }
    case 11: {
      const otMinutes =
        (Number(r?.overtimeMinutes) || 0) > 0
          ? Number(r?.overtimeMinutes)
          : worked >= 480
            ? worked - 480
            : 0;
      return otMinutes > 0 ? fmtDuration(otMinutes) : '';
    }
    case 12: {
      const deficit = worked < 240 ? worked : worked < 480 ? worked - 240 : 0;
      return deficit > 0 ? fmtDuration(deficit) : '';
    }
    default:
      return '';
  }
}

export function getRecordFieldPatch(
  r: TimesheetWorkspaceRecord | undefined,
  field: EditableField,
): DayCellUpdates {
  const disp = getRecordFieldDisplayValue(r, field);
  return parseRawCellValueToUpdates(field, disp) ?? {};
}

export function isHeaderColActive(
  isRow2: boolean,
  index: number,
  field?: string | null,
  minVisualCol = -1,
  maxVisualCol = -1,
): boolean {
  const singleVisualCol =
    field && field in VISUAL_COL_BY_FIELD
      ? VISUAL_COL_BY_FIELD[field as EditableField]
      : -1;
  const lo = minVisualCol >= 0 ? minVisualCol : singleVisualCol;
  const hi = maxVisualCol >= 0 ? maxVisualCol : singleVisualCol;
  if (lo < 0 || hi < 0) return false;

  const overlaps = (startCol: number, endCol: number) =>
    lo <= endCol && hi >= startCol;

  if (!isRow2) {
    if (index === 2) return overlaps(0, 1);
    if (index === 3) return overlaps(2, 3);
    if (index === 4) return overlaps(4, 7);
    if (index === 5) return overlaps(8, 9);
    if (index === 6) return overlaps(10, 10);
    if (index === 7) return overlaps(11, 11);
    if (index === 8) return overlaps(12, 12);
    if (index === 9) return overlaps(13, 13);
    if (index === 10) return overlaps(14, 14);
    if (index === 11) return overlaps(15, 15);
    return false;
  }
  if (index >= 0 && index <= 9) {
    return overlaps(index, index);
  }
  return false;
}
export { fmtWork };
