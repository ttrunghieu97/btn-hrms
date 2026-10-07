import { formatDateVN } from "@/lib/date";
import type { EmployeeResponseDto } from '@/api/generated/model';
import { employeeUiCopy } from '@/lib/app-copy';
import { extractProtectedAssetUrl, toProtectedAssetUrl } from '@/lib/asset-url';
import { getRequestId } from '@/lib/request-id';
import { getEmployeeStatusLabel } from './employee-status';

/** Create a locally-unique ID for UI items (certifications, etc.) */
export function createLocalId(prefix: string) {
  return `${prefix}-${getRequestId()}`;
}

/** Extract filename from a URL string */
export function getFileName(value: string) {
  if (!value.trim()) return '';

  const source = value.split('?')[0];
  const parts = source.split('/');
  return decodeURIComponent(parts[parts.length - 1] ?? '');
}

/** Display full name from employee */
export function getEmployeeName(employee: EmployeeResponseDto | null) {
  if (!employee) return '';

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
  return fullName || employee.username;
}

/** Safely extract a text string from a possibly-object value */
export function getTextString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    const candidate = Object.values(value).find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (candidate) return candidate;
  }

  return fallback;
}

/** Format a value with fallback text */
export function formatValue(value: unknown, fallback = 'N/A') {
  const text = getTextString(value);
  return text.trim().length > 0 ? text : fallback;
}

/** Format gender from stored value to display label */
export function formatGender(value: unknown) {
  const matched = employeeUiCopy.options.genders.find((option) => option.value === value);
  if (matched) return matched.label;
  return formatValue(value);
}

/** Format status from stored value to display label */
export function formatStatus(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'N/A';
  return getEmployeeStatusLabel(value);
}

/** Format address object/string to display string */
export function formatAddress(value: unknown, fallback = 'N/A') {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (!value || typeof value !== 'object') return fallback;

  const parts = Object.values(value).filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(', ') : fallback;
}

/** Format date to vi-VN locale string */
export function formatDate(value: unknown, fallback = 'N/A') {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return formatDateVN(date);
}

/** Convert various date formats to yyyy-MM-dd for input[type=date] */
export function toDateInputValue(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const matched = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (matched) return matched[0];

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get initials from employee name */
export function getInitials(employee: EmployeeResponseDto) {
  const initials = [employee.lastName, employee.firstName]
    .filter(Boolean)
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('');

  if (initials) return initials;

  const username = typeof employee.username === 'string' ? employee.username.trim() : '';
  if (username) return username.slice(0, 2).toUpperCase();

  return 'NV';
}

/** Extract asset (attachment) URL from employee data */
export function extractAssetUrl(value: unknown) {
  return extractProtectedAssetUrl(value);
}

/** Convert internal asset path to full URL */
export function toAssetUrl(value: string) {
  return toProtectedAssetUrl(value);
}
