import { pgEnum } from "drizzle-orm/pg-core";

export const clearanceDepartmentEnum = pgEnum("clearance_department_enum", [
  "it",
  "hr",
  "finance",
  "manager",
  "security",
]);

export const clearanceDecisionEnum = pgEnum("clearance_decision_enum", [
  "pending",
  "approved",
  "rejected",
]);

export const settlementStatusEnum = pgEnum("settlement_status_enum", [
  "pending",
  "processing",
  "settled",
  "failed",
]);
