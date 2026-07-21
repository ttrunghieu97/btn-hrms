import { pgEnum } from "drizzle-orm/pg-core";

export const weekdayEnum = pgEnum("weekday_enum", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const shiftAssignmentStatusEnum = pgEnum(
  "shift_assignment_status_enum",
  ["planned", "published", "completed", "cancelled"],
);

export const availabilitySourceEnum = pgEnum("availability_source_enum", [
  "employee",
  "manager",
]);

export const scheduleRequestTypeEnum = pgEnum("schedule_request_type_enum", [
  "MORNING_OFF",
  "AFTERNOON_OFF",
  "FULL_DAY_OFF",
]);

export const scheduleRequestStatusEnum = pgEnum("schedule_request_status_enum", [
  "PENDING",
  "APPROVED",
  "DENIED",
]);
