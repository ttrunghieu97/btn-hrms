export const AttendancePeriodStatus = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  LOCKED: "locked",
  PAYROLL_PROCESSING: "payroll_processing",
  PAYROLL_POSTED: "payroll_posted",
  CLOSED: "closed",
} as const;

export type AttendancePeriodStatusType = (typeof AttendancePeriodStatus)[keyof typeof AttendancePeriodStatus];

export const PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
