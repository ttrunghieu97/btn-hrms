import { pgEnum } from "drizzle-orm/pg-core";

export const notificationTypeEnum = pgEnum("notification_type_enum", [
  "email",
  "sms",
  "push",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status_enum", [
  "pending",
  "sent",
  "failed",
]);
