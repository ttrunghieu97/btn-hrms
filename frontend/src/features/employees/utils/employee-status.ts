/**
 * Pure helpers for employee status / contract expiry derivation.
 * Ported from legacy `features/employees/utils/employee-status.ts`,
 * stripped of Tailwind class strings (UI concern — moved into the
 * component layer when ported in a later wave).
 */

import { addDays } from 'date-fns';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { employeeUiCopy } from '@/lib/app-copy';
import type { EmployeeStatus } from '../schemas/employee.schema';

export type SmartStatusKind =
  | 'working'
  | 'probation'
  | 'terminated'
  | 'leave'
  | 'suspended'
  | 'retired'
  | 'unknown';

const labelByStatus: Record<SmartStatusKind, string> = {
  working: employeeUiCopy.statusText.working,
  probation: employeeUiCopy.statusText.probation,
  terminated: employeeUiCopy.statusText.terminated,
  leave: employeeUiCopy.statusText.leave,
  suspended: employeeUiCopy.statusText.suspended,
  retired: employeeUiCopy.statusText.retired,
  unknown: employeeUiCopy.statusText.unknown
};

export function getEmployeeStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'working':
      return labelByStatus.working;
    case 'probation':
      return labelByStatus.probation;
    case 'terminated':
      return labelByStatus.terminated;
    case 'leave':
      return labelByStatus.leave;
    case 'suspended':
      return labelByStatus.suspended;
    case 'retired':
      return labelByStatus.retired;
    default:
      return labelByStatus.unknown;
  }
}

interface SmartStatusInput {
  status?: EmployeeStatus | string | null;
  contractType?: string | null;
  contractStatus?: string | null;
}

export function getSmartStatus(employee: SmartStatusInput): {
  kind: SmartStatusKind;
  label: string;
} {
  switch (employee.status) {
    case 'working':
    case 'probation':
    case 'terminated':
    case 'leave':
    case 'suspended':
    case 'retired':
      return { kind: employee.status, label: labelByStatus[employee.status] };
    default:
      break;
  }

  if (employee.contractType === 'probationary') {
    return { kind: 'probation', label: labelByStatus.probation };
  }

  if (employee.contractStatus === 'terminated') {
    return { kind: 'terminated', label: labelByStatus.terminated };
  }

  if (employee.contractStatus === 'active') {
    return { kind: 'working', label: labelByStatus.working };
  }

  return { kind: 'unknown', label: labelByStatus.unknown };
}

/** Returns true when a date string represents a value within the next 30 days. */
export function isExpiringSoon(dateString?: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date > now && date < addDays(now, 30);
}

/** Stable identity for an employee row (id → username → composite name). */
export function getEmployeeKey(
  employee: Pick<EmployeeResponseDto, 'id' | 'username' | 'firstName' | 'lastName'>
): string {
  return (
    employee.id ||
    employee.username ||
    [employee.lastName, employee.firstName].filter(Boolean).join('-') ||
    'unknown'
  );
}
