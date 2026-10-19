import type { StatusMap } from '@/components/ui/status-badge';
import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from './types';
import { fmtTime, fmtWork } from './detail-columns';

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
  | 'workedHours'
  | 'congChinh'
  | 'otHours'
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
  'workedHours',
  'congChinh',
  'otHours',
  'nightShift',
  'waterBooth',
  'note',
];

export const FIELD_LABELS: Record<EditableField, string> = {
  checkInMorning: 'Ca sáng · Vào',
  checkOutMorning: 'Ca sáng · Ra',
  checkInAfternoon: 'Ca chiều · Vào',
  checkOutAfternoon: 'Ca chiều · Ra',
  breakHours: 'Nghỉ trưa (giờ)',
  personalBreakHours: 'Việc riêng (giờ)',
  lunchDutyHours: 'Trực trưa 25k (giờ)',
  duty30kHours: 'Trực 35k (giờ)',
  workedHours: 'Tổng giờ (fx)',
  congChinh: 'Công chính (fx)',
  otHours: 'Tăng ca (giờ)',
  nightShift: 'Trực đêm (lần)',
  waterBooth: 'Đứng nước (lần)',
  note: 'Ghi chú',
};

export const WEEKDAY_SHIFT_FIELDS = new Set<EditableField>([
  'checkInMorning',
  'checkOutMorning',
  'checkInAfternoon',
  'checkOutAfternoon',
  'workedHours',
  'congChinh',
  'breakHours',
]);

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
  if (/^\d{1,2}$/.test(s)) {
    const h = parseInt(s, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  }
  if (/^\d{3,4}$/.test(s)) {
    const padded = s.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  if (/^\d{1,2}:\d{1,2}$/.test(s)) {
    const [hStr, mStr] = s.split(':');
    const h = parseInt(hStr!, 10);
    const m = parseInt(mStr!, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return s;
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
  let breakAlreadyDeducted = false;

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
    const fullSpan = outA - inM;
    const defaultLunch = params.breakMinutes != null ? params.breakMinutes : 90;
    total = Math.max(0, fullSpan - defaultLunch);
    hasAny = true;
    breakAlreadyDeducted = true;
  }

  if (!hasAny) return null;
  const remainingBreak = breakAlreadyDeducted ? 0 : breakMins;
  return Math.max(0, total - personal - remainingBreak - lunchDuty - duty35k);
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
  isSun: boolean;
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
  return params.isSun ? 'off' : 'absent';
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

export function applyDayPatchToRecord(
  curr: TimesheetWorkspaceRecord | undefined,
  employeeId: string,
  wd: string,
  isSun: boolean,
  updates: DayCellUpdates,
): TimesheetWorkspaceRecord {
  const nextInM =
    updates.checkInMorning !== undefined
      ? updates.checkInMorning
      : (curr?.checkInMorning ?? curr?.checkIn ?? null);
  const nextOutM =
    updates.checkOutMorning !== undefined ? updates.checkOutMorning : (curr?.checkOutMorning ?? null);
  const nextInA =
    updates.checkInAfternoon !== undefined ? updates.checkInAfternoon : (curr?.checkInAfternoon ?? null);
  const nextOutA =
    updates.checkOutAfternoon !== undefined
      ? updates.checkOutAfternoon
      : (curr?.checkOutAfternoon ?? curr?.checkOut ?? null);
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

  const hasPunchChange =
    updates.checkInMorning !== undefined ||
    updates.checkOutMorning !== undefined ||
    updates.checkInAfternoon !== undefined ||
    updates.checkOutAfternoon !== undefined ||
    updates.personalBreakMinutes !== undefined ||
    updates.breakMinutes !== undefined ||
    updates.lunchDutyMinutes !== undefined ||
    updates.duty30kMinutes !== undefined;

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
      : hasPunchChange
        ? (autoWorked ?? 0)
        : autoWorked !== null
          ? autoWorked
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
    checkIn: nextInM ?? curr?.checkIn ?? null,
    checkOut: nextOutA ?? nextOutM ?? curr?.checkOut ?? null,
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
    isHoliday: curr?.isHoliday ?? isSun,
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
    return { [field]: normalizeTimeString(rawStr) };
  }
  if (field === 'note') {
    return { note: rawStr.trim() };
  }
  const clean = rawStr.replace(',', '.').trim();
  const num = !clean || clean === '-' || clean === '—' ? 0 : parseFloat(clean);
  if (isNaN(num) || num < 0) return null;

  switch (field) {
    case 'workedHours':
      return { workedMinutes: Math.min(1440, Math.round(num * 60)) };
    case 'congChinh':
      return { workedMinutes: Math.min(1440, Math.round(num * 480)) };
    case 'otHours':
      return { overtimeMinutes: Math.min(1440, Math.round(num * 60)) };
    case 'breakHours':
      return { breakMinutes: Math.round(num * 60) };
    case 'personalBreakHours':
      return { personalBreakMinutes: Math.round(num * 60) };
    case 'lunchDutyHours':
      return { lunchDutyMinutes: Math.round(num * 60) };
    case 'duty30kHours':
      return { duty30kMinutes: Math.round(num * 60) };
    case 'nightShift':
      return { nightShiftDutyCount: Math.round(num) };
    case 'waterBooth':
      return { waterBoothDutyCount: Math.round(num) };
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
      const t = fmtTime(r.checkInMorning ?? r.checkIn);
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
      const t = fmtTime(r.checkOutAfternoon ?? r.checkOut);
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
    case 'workedHours': {
      const w = Number(r.workedMinutes) || 0;
      return w > 0 ? String(Number((w / 60).toFixed(1))) : '';
    }
    case 'congChinh': {
      const w = Number(r.workedMinutes) || 0;
      return w >= 480 ? '1' : w >= 240 ? '0.5' : '';
    }
    case 'otHours': {
      const w = Number(r.workedMinutes) || 0;
      const ot =
        (Number(r.overtimeMinutes) || 0) > 0
          ? Number(r.overtimeMinutes)
          : w >= 480
            ? w - 480
            : 0;
      return ot > 0 ? String(Number((ot / 60).toFixed(1))) : '';
    }
    case 'nightShift':
      return Number(r.nightShiftDutyCount) > 0 ? String(r.nightShiftDutyCount) : '';
    case 'waterBooth':
      return Number(r.waterBoothDutyCount) > 0 ? String(r.waterBoothDutyCount) : '';
    case 'note':
      return r.note || '';
  }
}

export function getRecordFieldPatch(
  r: TimesheetWorkspaceRecord | undefined,
  field: EditableField,
): DayCellUpdates {
  const disp = getRecordFieldDisplayValue(r, field);
  return parseRawCellValueToUpdates(field, disp) ?? {};
}

export function isHeaderColActive(isRow2: boolean, index: number, field?: string | null): boolean {
  if (!field) return false;
  if (!isRow2) {
    if (index === 2) return field === 'checkInMorning' || field === 'checkOutMorning';
    if (index === 3) return field === 'checkInAfternoon' || field === 'checkOutAfternoon';
    if (index === 4)
      return (
        field === 'breakHours' ||
        field === 'personalBreakHours' ||
        field === 'lunchDutyHours' ||
        field === 'duty30kHours'
      );
    if (index === 5) return field === 'workedHours';
    if (index === 6) return field === 'congChinh';
    if (index === 7) return field === 'otHours';
    if (index === 9) return field === 'nightShift';
    if (index === 10) return field === 'waterBooth';
    if (index === 11) return field === 'note';
    return false;
  }
  if (index === 0) return field === 'checkInMorning';
  if (index === 1) return field === 'checkOutMorning';
  if (index === 2) return field === 'checkInAfternoon';
  if (index === 3) return field === 'checkOutAfternoon';
  if (index === 4) return field === 'breakHours';
  if (index === 5) return field === 'personalBreakHours';
  if (index === 6) return field === 'lunchDutyHours';
  if (index === 7) return field === 'duty30kHours';
  if (index === 8) return field === 'workedHours';
  return false;
}
export { fmtWork };
