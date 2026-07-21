import { pgEnum } from "drizzle-orm/pg-core";

export const attendanceSessionEnum = pgEnum("attendance_session_enum", [
  "morning",
  "noon",
  "afternoon",
]);

export const attendanceSessionTypeEnum = pgEnum("attendance_session_type_enum", [
  "MORNING",
  "AFTERNOON",
  "LUNCH_DUTY",
  "NIGHT",
  "OT",
]);

export const attendanceSessionStatusEnum = pgEnum("attendance_session_status_enum", [
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
]);

export const attendanceTypeEnum = pgEnum("attendance_type_enum", [
  "check_in",
  "check_out",
  "break_start",
  "break_end",
  // Used by the web app to store per-day notes (legacy-compatible).
  "note",
]);

export const punchVerificationStatusEnum = pgEnum(
  "punch_verification_status_enum",
  ["verified", "flagged", "rejected"],
);

export const leaveUnitEnum = pgEnum("leave_unit_enum", ["day", "hour"]);

export const leaveRequestStatusEnum = pgEnum("leave_request_status_enum", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const leaveSessionEnum = pgEnum("leave_session_enum", [
  "full_day",
  "morning",
  "afternoon",
]);

export const attendanceSummaryStatusEnum = pgEnum(
  "attendance_summary_status_enum",
  ["present", "late", "early_leave", "absent", "leave", "holiday", "off"],
);

export const overtimeStatusEnum = pgEnum("overtime_status_enum", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const attendanceOverrideReasonEnum = pgEnum("attendance_override_reason_enum", [
  "manual_correction",
  "policy_exception",
  "data_fix",
  "reconciliation",
]);

export const attendanceEventTypeEnum = pgEnum("attendance_event_type_enum", [
  "CLOCK_IN",
  "CLOCK_OUT",
]);

export const attendanceEventSourceEnum = pgEnum("attendance_event_source_enum", [
  "DEVICE",
  "MANUAL",
]);

export const attendanceSourceEnum = pgEnum("attendance_source_enum", [
  "mobile",
  "web",
  "api",
  "manual",
]);

export const lunchDutyTypeEnum = pgEnum("lunch_duty_type_enum", [
  "indoor",
  "outdoor",
]);

export const attendanceExceptionTypeEnum = pgEnum(
  "attendance_exception_type_enum",
  ["missing_punch", "invalid_sequence", "off_shift"],
);

export const attendanceExceptionStatusEnum = pgEnum(
  "attendance_exception_status_enum",
  ["pending", "resolved", "closed"],
);
