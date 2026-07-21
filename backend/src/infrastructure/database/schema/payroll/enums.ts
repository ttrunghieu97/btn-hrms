import { pgEnum } from "drizzle-orm/pg-core";

export const payrollPeriodStatusEnum = pgEnum("payroll_period_status_enum", [
  "draft",
  "open",
  "processing",
  "closed",
  "paid",
]);

export const payrollRunStatusEnum = pgEnum("payroll_run_status_enum", [
  "draft",
  "processing",
  "pending_approval",
  "approved",
  "posted",
  "cancelled",
]);

export const payrollItemTypeEnum = pgEnum("payroll_item_type_enum", [
  "earning",
  "deduction",
  "tax",
  "insurance",
  "employer_contribution",
  "overtime",
  "adjustment",
]);

export const payslipStatusEnum = pgEnum("payslip_status_enum", [
  "draft",
  "published",
  "acknowledged",
  "voided",
]);

export const payFrequencyEnum = pgEnum("pay_frequency_enum", [
  "monthly",
  "semi_monthly",
  "bi_weekly",
  "weekly",
]);

export const statutoryContributionTypeEnum = pgEnum(
  "statutory_contribution_type_enum",
  ["social_insurance", "health_insurance", "unemployment_insurance"],
);
