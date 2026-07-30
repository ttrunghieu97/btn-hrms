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

export const payrollInputSnapshotStatusEnum = pgEnum("payroll_input_snapshot_status_enum", [
  "generating",
  "ready",
  "consumed",
  "locked",
]);

export const payrollCalculationVersionStatusEnum = pgEnum(
  "payroll_calculation_version_status_enum",
  ["draft", "active", "superseded", "archived"],
);

export const payrollInputTypeEnum = pgEnum("payroll_input_type_enum", [
  "ATTENDANCE_REGULAR_MINUTES",
  "ATTENDANCE_OVERTIME_MINUTES",
  "ATTENDANCE_ADJUSTMENT_REGULAR",
  "ATTENDANCE_ADJUSTMENT_OVERTIME",
  "BASE_SALARY",
  "ALLOWANCE_TOTAL",
  "DEDUCTION_TOTAL",
]);
