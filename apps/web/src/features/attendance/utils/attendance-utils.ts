import { format } from 'date-fns';

import type { AttendanceResponseDto, AttendanceResponseDtoLunchDutyType } from '@/api/generated/model';
import { attendanceUiCopy } from '@/lib/app-copy';
import type { SessionTimes } from '../schemas/attendance.schema';

type AttendanceSession = 'morning' | 'noon' | 'afternoon';
type LooseAttendanceRecord = AttendanceResponseDto & Record<string, unknown>;
type LooseSessionRecord = Record<string, unknown>;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface SessionRecord {
  morning?: SessionTimes;
  afternoon?: SessionTimes;
  noon?: SessionTimes;
}

export interface SessionMeta {
  gps?: string | null;
  ip?: string | null;
  verificationStatus?: string | null;
  flags?: any;
}

export interface MyAttendanceDayRecord extends AttendanceResponseDto {
  morningCheckin: string | null;
  morningCheckout: string | null;
  noonCheck: string | null;
  afternoonCheckin: string | null;
  afternoonCheckout: string | null;
  morningCheckinImage: string | null;
  morningCheckoutImage: string | null;
  noonCheckImage: string | null;
  afternoonCheckinImage: string | null;
  afternoonCheckoutImage: string | null;
  morningCheckinMeta?: SessionMeta | null;
  morningCheckoutMeta?: SessionMeta | null;
  noonCheckMeta?: SessionMeta | null;
  afternoonCheckinMeta?: SessionMeta | null;
  afternoonCheckoutMeta?: SessionMeta | null;
  note: string | null;
  lunchDutyType: AttendanceResponseDtoLunchDutyType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function extractTimeValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return null;
  return (
    extractString(value.time) ??
    extractString(value.value) ??
    extractString(value.timestamp) ??
    null
  );
}

function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY_RE.exec(value);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    return new Date(year, month - 1, day);
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function createEmptyDayRecord(
  date: string,
  seed?: LooseAttendanceRecord
): MyAttendanceDayRecord {
  return {
    username: extractString(seed?.username) ?? '',
    date,
    morningCheckin: null,
    morningCheckout: null,
    noonCheck: null,
    afternoonCheckin: null,
    afternoonCheckout: null,
    morningCheckinImage: null,
    morningCheckoutImage: null,
    noonCheckImage: null,
    afternoonCheckinImage: null,
    afternoonCheckoutImage: null,
    note: extractString(seed?.note),
    lunchDutyType: extractString(seed?.lunchDutyType) as AttendanceResponseDtoLunchDutyType,
    employee: seed?.employee,
    createdAt: extractString(seed?.createdAt) ?? `${date}T00:00:00.000Z`,
    updatedAt: extractString(seed?.updatedAt) ?? `${date}T00:00:00.000Z`
  };
}

function getSessionPayload(record: LooseAttendanceRecord, key: AttendanceSession): LooseSessionRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function hasDailyShape(record: LooseAttendanceRecord): boolean {
  return [
    'morningCheckin',
    'morningCheckout',
    'noonCheck',
    'afternoonCheckin',
    'afternoonCheckout',
    'morning',
    'afternoon',
    'noon'
  ].some((key) => key in record);
}

function inferSession(session: unknown, time: unknown): AttendanceSession {
  if (session === 'morning' || session === 'noon' || session === 'afternoon') {
    return session;
  }

  const label = formatTime(time);
  if (!label) return 'morning';

  const [hours] = label.split(':').map((part) => Number.parseInt(part, 10));
  if (hours < 12) return 'morning';
  if (hours < 14) return 'noon';
  return 'afternoon';
}

function applyDailyRecord(
  target: MyAttendanceDayRecord,
  source: LooseAttendanceRecord
) {
  const morning = getSessionPayload(source, 'morning');
  const noon = getSessionPayload(source, 'noon');
  const afternoon = getSessionPayload(source, 'afternoon');

  target.username = extractString(source.username) ?? target.username;
  target.employee = source.employee ?? target.employee;
  target.createdAt = extractString(source.createdAt) ?? target.createdAt;
  target.updatedAt = extractString(source.updatedAt) ?? target.updatedAt;

  target.morningCheckin =
    extractTimeValue(source.morningCheckin) ??
    extractTimeValue(morning.checkin) ??
    target.morningCheckin;
  target.morningCheckout =
    extractTimeValue(source.morningCheckout) ??
    extractTimeValue(morning.checkout) ??
    target.morningCheckout;
  target.noonCheck =
    extractTimeValue(source.noonCheck) ??
    extractTimeValue(noon.check) ??
    extractTimeValue(noon.checkin) ??
    target.noonCheck;
  target.afternoonCheckin =
    extractTimeValue(source.afternoonCheckin) ??
    extractTimeValue(afternoon.checkin) ??
    target.afternoonCheckin;
  target.afternoonCheckout =
    extractTimeValue(source.afternoonCheckout) ??
    extractTimeValue(afternoon.checkout) ??
    target.afternoonCheckout;

  target.morningCheckinImage =
    extractString(source.morningCheckinImage) ??
    extractString(morning.checkinImage) ??
    target.morningCheckinImage;
  target.morningCheckoutImage =
    extractString(source.morningCheckoutImage) ??
    extractString(morning.checkoutImage) ??
    target.morningCheckoutImage;
  target.noonCheckImage =
    extractString(source.noonCheckImage) ??
    extractString(noon.checkImage) ??
    extractString(noon.checkinImage) ??
    target.noonCheckImage;
  target.afternoonCheckinImage =
    extractString(source.afternoonCheckinImage) ??
    extractString(afternoon.checkinImage) ??
    target.afternoonCheckinImage;
  target.afternoonCheckoutImage =
    extractString(source.afternoonCheckoutImage) ??
    extractString(afternoon.checkoutImage) ??
    target.afternoonCheckoutImage;
  target.note = extractString(source.note) ?? target.note;
}

function applyEventRecord(
  target: MyAttendanceDayRecord,
  source: LooseAttendanceRecord
) {
  const time = extractTimeValue(source.time);
  const image = extractString(source.image);
  const eventType = extractString(source.type);
  const session = inferSession(source.session, source.time);

  const meta: SessionMeta = {
    gps: source.latitude && source.longitude ? `${source.latitude}, ${source.longitude}` : null,
    ip: (source as any).ipAddress ?? null,
    verificationStatus: (source as any).verificationStatus ?? null,
    flags: (source as any).flags ?? null,
  };

  target.username = extractString(source.username) ?? target.username;
  target.employee = source.employee ?? target.employee;
  target.createdAt = extractString(source.createdAt) ?? target.createdAt;
  target.updatedAt = extractString(source.updatedAt) ?? target.updatedAt;

  if (eventType === 'note') {
    target.note = extractString(source.note) ?? target.note;
    return;
  }

  if (eventType === 'break_start' || eventType === 'check') {
    target.noonCheck = time ?? target.noonCheck;
    target.noonCheckImage = image ?? target.noonCheckImage;
    target.noonCheckMeta = meta;
    return;
  }

  if (eventType === 'check_in' || eventType === 'checkin') {
    if (session === 'morning') {
      target.morningCheckin = time ?? target.morningCheckin;
      target.morningCheckinImage = image ?? target.morningCheckinImage;
      target.morningCheckinMeta = meta;
      return;
    }

    if (session === 'noon') {
      target.noonCheck = time ?? target.noonCheck;
      target.noonCheckImage = image ?? target.noonCheckImage;
      target.noonCheckMeta = meta;
      target.lunchDutyType = (extractString((source as any).lunchDutyType) ?? target.lunchDutyType) as AttendanceResponseDtoLunchDutyType;
      return;
    }

    target.afternoonCheckin = time ?? target.afternoonCheckin;
    target.afternoonCheckinImage = image ?? target.afternoonCheckinImage;
    target.afternoonCheckinMeta = meta;
    return;
  }

  if (eventType === 'check_out' || eventType === 'checkout') {
    if (session === 'morning') {
      target.morningCheckout = time ?? target.morningCheckout;
      target.morningCheckoutImage = image ?? target.morningCheckoutImage;
      target.morningCheckoutMeta = meta;
      return;
    }

    if (session === 'noon') {
      target.noonCheck = time ?? target.noonCheck;
      target.noonCheckImage = image ?? target.noonCheckImage;
      target.noonCheckMeta = meta;
      return;
    }

    target.afternoonCheckout = time ?? target.afternoonCheckout;
    target.afternoonCheckoutImage = image ?? target.afternoonCheckoutImage;
    target.afternoonCheckoutMeta = meta;
  }
}

export function minutesSinceMidnight(time: unknown): number | null {
  const label = formatTime(time);
  if (!label) return null;

  const [hours, minutes] = label.split(':').map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function sessionDuration(session: SessionTimes | undefined): number {
  if (!session) return 0;
  const start = minutesSinceMidnight(session.checkin ?? null);
  const end = minutesSinceMidnight(session.checkout ?? null);
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

export function toSessionRecord(dto: AttendanceResponseDto): SessionRecord {
  return {
    morning: {
      checkin: extractTimeValue((dto as LooseAttendanceRecord).morningCheckin),
      checkout: extractTimeValue((dto as LooseAttendanceRecord).morningCheckout)
    },
    afternoon: {
      checkin: extractTimeValue((dto as LooseAttendanceRecord).afternoonCheckin),
      checkout: extractTimeValue((dto as LooseAttendanceRecord).afternoonCheckout)
    },
    noon: {
      checkin: extractTimeValue((dto as LooseAttendanceRecord).noonCheck)
    }
  };
}

export function calculateTotalHours(rec?: SessionRecord | null): string {
  if (!rec) return '--:--';

  const total = sessionDuration(rec.morning) + sessionDuration(rec.afternoon);
  if (
    total === 0 &&
    !rec.morning?.checkin &&
    !rec.morning?.checkout &&
    !rec.afternoon?.checkin &&
    !rec.afternoon?.checkout
  ) {
    return '';
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function currentMonthString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatAttendanceDate(dateString: string): string {
  const date = parseDateOnly(dateString);
  if (!date) return dateString;
  return format(date, 'dd/MM/yyyy');
}

export function getDayOfWeek(dateString: string): string {
  const date = parseDateOnly(dateString);
  if (!date) return '';
  return attendanceUiCopy.daysOfWeek[date.getDay()] ?? '';
}

export function formatTime(value: unknown): string {
  const timeStr = extractTimeValue(value);
  if (!timeStr) return '';

  if (TIME_ONLY_RE.test(timeStr)) {
    return timeStr.slice(0, 5);
  }

  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'HH:mm');
}

export function normalizeMyAttendanceRows(
  rows: AttendanceResponseDto[]
): MyAttendanceDayRecord[] {
  const map = new Map<string, MyAttendanceDayRecord>();

  for (const row of rows as LooseAttendanceRecord[]) {
    const date = extractString(row.date);
    if (!date) continue;

    const current = map.get(date) ?? createEmptyDayRecord(date, row);

    if (hasDailyShape(row)) {
      applyDailyRecord(current, row);
    } else {
      applyEventRecord(current, row);
    }

    map.set(date, current);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMonthAttendanceRows(
  rows: AttendanceResponseDto[],
  month: string = currentMonthString()
): MyAttendanceDayRecord[] {
  const normalized = normalizeMyAttendanceRows(rows);
  const byDate = new Map(normalized.map((row) => [row.date, row]));

  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return normalized;

  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, offset) => {
    const date = toDateString(new Date(year, monthIndex, offset + 1));
    return byDate.get(date) ?? createEmptyDayRecord(date);
  });
}

export interface SessionStatusInfo {
  session: 'morning' | 'afternoon';
  status: 'not-checked-in' | 'checked-in' | 'checked-out';
}

export function getSessionStatus(
  todayRecord: MyAttendanceDayRecord | null | undefined,
  hour: number
): SessionStatusInfo {
  if (!todayRecord) {
    return {
      session: hour < 12 ? 'morning' : 'afternoon',
      status: 'not-checked-in',
    };
  }

  const morningCheckin = todayRecord.morningCheckin;
  const morningCheckout = todayRecord.morningCheckout;
  const afternoonCheckin = todayRecord.afternoonCheckin;
  const afternoonCheckout = todayRecord.afternoonCheckout;

  // If morning checkin is missing, check if they are in morning or afternoon session
  if (!morningCheckin) {
    if (hour >= 12) {
      if (!afternoonCheckin) {
        return { session: 'afternoon', status: 'not-checked-in' };
      } else if (!afternoonCheckout) {
        return { session: 'afternoon', status: 'checked-in' };
      } else {
        return { session: 'afternoon', status: 'checked-out' };
      }
    }
    return { session: 'morning', status: 'not-checked-in' };
  }

  // Morning check-in exists. If morning checkout is missing, they are currently checked in for morning.
  if (!morningCheckout) {
    return { session: 'morning', status: 'checked-in' };
  }

  // Morning session is fully completed. Evaluate afternoon session.
  if (!afternoonCheckin) {
    return { session: 'afternoon', status: 'not-checked-in' };
  }
  if (!afternoonCheckout) {
    return { session: 'afternoon', status: 'checked-in' };
  }
  return { session: 'afternoon', status: 'checked-out' };
}

export interface MonthAttendanceStats {
  congChinh: number;
  congChuNhat: number;
  gioLeMinutes: number;
  congChuyenCan: number;
  trucTruaTrongNhaHours: number;
  trucTruaNgoaiTroiHours: number;
  phatSinhHoTroMinutes: number;
}

export function formatMinutesToHm(total: number): string {
  if (total <= 0) return '0:00';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export function calculateMonthStats(rows: MyAttendanceDayRecord[]): MonthAttendanceStats {
  let congChinh = 0;
  let congChuNhat = 0;
  let gioLeMinutes = 0;
  let congChuyenCan = 0;
  let trucTruaTrongNhaHours = 0;
  let trucTruaNgoaiTroiHours = 0;
  let phatSinhHoTroMinutes = 0;

  for (const row of rows) {
    const sessionRecord = toSessionRecord(row);
    const totalMinutes = sessionDuration(sessionRecord.morning) + sessionDuration(sessionRecord.afternoon);

    const isSunday = getDayOfWeek(row.date) === 'Chủ nhật';

    // Workday coefficient (công)
    let dailyCong = 0;
    if (totalMinutes >= 8 * 60) {
      dailyCong = 1.0;
    } else if (totalMinutes >= 4 * 60) {
      dailyCong = 0.5;
    }

    congChinh += dailyCong;
    if (isSunday) {
      congChuNhat += dailyCong;
    }

    // Chuyên cần (>= 8 hours)
    if (totalMinutes >= 8 * 60) {
      congChuyenCan += 1;
    }

    // Giờ lẻ & Tăng ca (Phát sinh hỗ trợ)
    if (totalMinutes >= 8 * 60) {
      phatSinhHoTroMinutes += totalMinutes - 8 * 60;
    } else if (totalMinutes >= 4 * 60) {
      gioLeMinutes += totalMinutes - 4 * 60;
    } else {
      gioLeMinutes += totalMinutes;
    }

    // Trực trưa (Lunch duty)
    if (row.noonCheck) {
      if (row.lunchDutyType === 'outdoor') {
        trucTruaNgoaiTroiHours += 2;
      } else {
        // default to indoor
        trucTruaTrongNhaHours += 2;
      }
    }
  }

  return {
    congChinh,
    congChuNhat,
    gioLeMinutes,
    congChuyenCan,
    trucTruaTrongNhaHours,
    trucTruaNgoaiTroiHours,
    phatSinhHoTroMinutes
  };
}
