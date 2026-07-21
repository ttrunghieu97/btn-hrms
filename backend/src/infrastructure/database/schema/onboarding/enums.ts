import { pgEnum } from "drizzle-orm/pg-core";

export const boardingTypeEnum = pgEnum("boarding_type_enum", [
  "onboarding",
  "offboarding",
]);

export const boardingProcessStatusEnum = pgEnum("boarding_process_status_enum", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "terminated",
]);

export const checklistItemStatusEnum = pgEnum("checklist_item_status_enum", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);
