import { Injectable } from "@nestjs/common";

export const ATTENDANCE_PERIOD_STATUS_OPEN = "open" as const;
export const ATTENDANCE_PERIOD_STATUS_IN_REVIEW = "in_review" as const;
export const ATTENDANCE_PERIOD_STATUS_LOCKED = "locked" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING = "payroll_processing" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED = "payroll_posted" as const;
export const ATTENDANCE_PERIOD_STATUS_CLOSED = "closed" as const;

export const ATTENDANCE_PERIOD_STATUSES = [
  ATTENDANCE_PERIOD_STATUS_OPEN,
  ATTENDANCE_PERIOD_STATUS_IN_REVIEW,
  ATTENDANCE_PERIOD_STATUS_LOCKED,
  ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING,
  ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED,
  ATTENDANCE_PERIOD_STATUS_CLOSED,
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
  open: ["in_review", "locked"],
  in_review: ["open", "locked"],
  locked: ["open", "in_review", "payroll_processing"],
  payroll_processing: ["payroll_posted", "open"],
  payroll_posted: ["open", "closed"],
  closed: ["open"], // privileged reopen only
};

@Injectable()
export class AttendancePeriodLockService {
  canEdit(status: AttendancePeriodStatus): boolean {
    return status === "open" || status === "in_review";
  }

  canLock(status: AttendancePeriodStatus): boolean {
    return status === "open" || status === "in_review";
  }

  canUnlock(status: AttendancePeriodStatus): boolean {
    return status === "locked";
  }

  canReview(status: AttendancePeriodStatus): boolean {
    return status === "open";
  }

  canClose(status: AttendancePeriodStatus): boolean {
    return status === "payroll_posted";
  }

  canReopen(status: AttendancePeriodStatus): boolean {
    return status === "closed";
  }

  isPayrollLocked(status: AttendancePeriodStatus): boolean {
    return status === "payroll_processing" || status === "payroll_posted" || status === "closed";
  }

  isClosed(status: AttendancePeriodStatus): boolean {
    return status === "closed";
  }

  canTransition(from: AttendancePeriodStatus, to: AttendancePeriodStatus): boolean {
    const allowed = STATUS_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  isValidStatus(value: string): value is AttendancePeriodStatus {
    return (ATTENDANCE_PERIOD_STATUSES as readonly string[]).includes(value);
  }
}
