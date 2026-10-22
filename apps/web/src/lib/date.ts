/**
 * Shared date formatting utilities for BTN HRMS.
 *
 * Convention:
 *   - DB / API / form values: YYYY-MM-DD (ISO)
 *   - User-facing display:    DD/MM/YYYY (VN)
 *   - All formatting uses APP_TIMEZONE (Asia/Ho_Chi_Minh) unless explicitly overridden.
 */

import { envClient } from "./env.client";

const APP_TIMEZONE: string = envClient.timezone;

/**
 * Formats a Date/string to DD/MM/YYYY for display.
 * Handles ISO strings, Date objects, and YYYY-MM-DD inputs.
 */
export function formatDateVN(value: Date | string | number | null | undefined): string {
  if (value == null) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

/**
 * Formats a Date/string to DD/MM/YYYY HH:mm for display.
 */
export function formatDateTimeVN(value: Date | string | null | undefined): string {
  if (value == null) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

/**
 * Formats a Date/string to DD/MM (compact, same year assumed).
 */
export function formatShortDateVN(value: Date | string | null | undefined): string {
  if (value == null) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

/**
 * Returns YYYY-MM-DD for <input type="date"> value.
 * Also used for API/DB date-only values.
 */
export function formatDateForInput(value: Date | string | null | undefined): string {
  if (value == null) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

/**
 * Returns today's date as YYYY-MM-DD (for default form values, queries).
 */
export function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
  }).format(new Date());
}

/**
 * Returns today's date as DD/MM/YYYY (for display).
 */
export function todayDisplayVN(): string {
  return formatDateVN(new Date());
}
