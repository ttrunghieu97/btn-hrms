import { pgEnum } from "drizzle-orm/pg-core";

export const benefitTypeEnum = pgEnum("benefit_type_enum", [
  "health",
  "dental",
  "vision",
  "life",
  "pension",
  "meal",
  "transport",
  "gym",
  "custom",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status_enum", [
  "pending",
  "active",
  "cancelled",
  "expired",
]);

export const dependentRelationshipEnum = pgEnum("dependent_relationship_enum", [
  "spouse",
  "child",
  "parent",
  "partner",
  "other",
]);

export const enrollmentPeriodStatusEnum = pgEnum(
  "enrollment_period_status_enum",
  ["upcoming", "active", "closed"],
);
