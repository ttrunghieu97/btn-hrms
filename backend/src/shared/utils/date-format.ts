/** Application timezone. Hardcoded to Asia/Ho_Chi_Minh for single-tenant VN deployment. */
export const APP_TIMEZONE =
  (process.env.APP_TIMEZONE) ?? "Asia/Ho_Chi_Minh";

/**
 * Parses DD/MM/YYYY → YYYY-MM-DD string. Returns null on invalid input.
 */
const DD_MM_YYYY_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isValidDateParts(day: number, month: number, year: number) {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function normalizeDdMmYyyyToIsoDate(value: string): string | null {
  const normalized = value.trim();
  const match = DD_MM_YYYY_REGEX.exec(normalized);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!isValidDateParts(day, month, year)) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Returns today's date as YYYY-MM-DD in APP_TIMEZONE.
 * Use this instead of `new Date().toISOString().slice(0, 10)` for date-only columns.
 */
export function todayDateString(timezone?: string, date?: Date): string {
  const tz = timezone ?? APP_TIMEZONE;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date ?? new Date());
}

/**
 * Formats a Date/string to DD/MM/YYYY in APP_TIMEZONE for display (API-side formatting).
 * Prefer frontend-side formatting; use only when backend must emit display-ready dates.
 */
export function formatDateVN(value: Date | string, timezone?: string): string {
  const tz = timezone ?? APP_TIMEZONE;
  return new Intl.DateTimeFormat("vi-VN", { timeZone: tz }).format(new Date(value));
}

/**
 * Formats a Date/string to DD/MM/YYYY HH:mm in APP_TIMEZONE for display (API-side formatting).
 * Prefer frontend-side formatting; use only when backend must emit display-ready dates.
 */
export function formatDateTimeVN(value: Date | string, timezone?: string): string {
  const tz = timezone ?? APP_TIMEZONE;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Formats a Date to YYYY-MM-DD in APP_TIMEZONE.
 * Use for date-only values that need ISO string in local timezone (instead of .toISOString().slice(0, 10)).
 */
export function formatDateISO(value: Date, timezone?: string): string {
  const tz = timezone ?? APP_TIMEZONE;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(value);
}
