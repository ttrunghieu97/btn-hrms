import { Injectable } from "@nestjs/common";

export const ATTENDANCE_PERIOD_STATUS_OPEN = "open" as const;
export const ATTENDANCE_PERIOD_STATUS_LOCKED = "locked" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING = "payroll_processing" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED = "payroll_posted" as const;

export const ATTENDANCE_PERIOD_STATUSES = [
  ATTENDANCE_PERIOD_STATUS_OPEN,
  ATTENDANCE_PERIOD_STATUS_LOCKED,
  ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING,
  ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED,
] as const;

export type AttendancePeriodStatus = (typeof ATTENDANCE_PERIOD_STATUSES)[number];

export type AttendancePeriodLock = {
  id: string;
  period: string;
  status: AttendancePeriodStatus;
  lockedByUserId: string | null;
  lockedAt: Date | null;
  unlockedByUserId: string | null;
  unlockedAt: Date | null;
  remarks: string | null;
};

/** Valid transitions for period status. */
const STATUS_TRANSITIONS: Record<AttendancePeriodStatus, AttendancePeriodStatus[]> = {
  open: ["locked"],
  locked: ["open", "payroll_processing"],
  payroll_processing: ["payroll_posted", "open"],
  payroll_posted: ["open"],
};

@Injectable()
export class AttendancePeriodLockService {
  /**
   * Whether edits are allowed for a period at the given status.
   */
  canEdit(status: AttendancePeriodStatus): boolean {
    return status === "open";
  }

  /**
   * Whether the period can be locked.
   */
  canLock(status: AttendancePeriodStatus): boolean {
    return status === "open";
  }

  /**
   * Whether the period can be unlocked (requires elevated privilege).
   */
  canUnlock(status: AttendancePeriodStatus): boolean {
    return status === "locked";
  }

  /**
   * Whether payroll has locked this period — no edits allowed.
   */
  isPayrollLocked(status: AttendancePeriodStatus): boolean {
    return status === "payroll_processing" || status === "payroll_posted";
  }

  /**
   * Check if a status transition is valid.
   */
  canTransition(
    from: AttendancePeriodStatus,
    to: AttendancePeriodStatus,
  ): boolean {
    const allowed = STATUS_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  /**
   * Validate a status string is a known period status.
   */
  isValidStatus(value: string): value is AttendancePeriodStatus {
    return (ATTENDANCE_PERIOD_STATUSES as readonly string[]).includes(value);
  }
}
