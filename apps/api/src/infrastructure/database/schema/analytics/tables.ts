import {
  pgTable,
  uuid,
  date,
  timestamp,
  index,
  unique,
  check,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { branches, departments } from "../org/tables";
import { employees } from "../workforce/tables";
import { payrollPeriods } from "../payroll/tables";
import { employeeStatusEnum, employmentTypeEnum } from "../workforce/enums";

export const headcountSnapshots = pgTable(
  "headcount_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotDate: date("snapshot_date").notNull(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    employmentStatus: employeeStatusEnum("employment_status").notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    headcount: integer("headcount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxSnapshotDate: index("idx_headcount_snapshots_date").on(
      table.snapshotDate,
    ),
    chkHeadcountNonNegative: check(
      "chk_headcount_snapshots_headcount",
      sql`${table.headcount} >= 0`,
    ),
  }),
);

export const attendanceMonthlyAggregates = pgTable(
  "attendance_monthly_aggregates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
    totalScheduledMinutes: integer("total_scheduled_minutes")
      .default(0)
      .notNull(),
    totalLateCount: integer("total_late_count").default(0).notNull(),
    totalAbsentDays: integer("total_absent_days").default(0).notNull(),
    totalLeaveDays: numeric("total_leave_days", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    totalOvertimeMinutes: integer("total_overtime_minutes")
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqEmployeeMonth: unique(
      "uq_attendance_monthly_aggregates_employee_month",
    ).on(table.employeeId, table.year, table.month),
    idxYearMonth: index("idx_attendance_agg_year_month").on(
      table.year,
      table.month,
    ),
    chkMonthRange: check(
      "chk_attendance_monthly_aggregates_month",
      sql`${table.month} >= 1 and ${table.month} <= 12`,
    ),
    chkWorkedNonNegative: check(
      "chk_attendance_monthly_aggregates_worked_non_negative",
      sql`${table.totalWorkedMinutes} >= 0`,
    ),
    chkScheduledNonNegative: check(
      "chk_attendance_monthly_aggregates_scheduled_non_negative",
      sql`${table.totalScheduledMinutes} >= 0`,
    ),
    chkLateNonNegative: check(
      "chk_attendance_monthly_aggregates_late_non_negative",
      sql`${table.totalLateCount} >= 0`,
    ),
    chkAbsentNonNegative: check(
      "chk_attendance_monthly_aggregates_absent_non_negative",
      sql`${table.totalAbsentDays} >= 0`,
    ),
    chkLeaveNonNegative: check(
      "chk_attendance_monthly_aggregates_leave_non_negative",
      sql`${table.totalLeaveDays} >= 0`,
    ),
    chkOvertimeNonNegative: check(
      "chk_attendance_monthly_aggregates_overtime_non_negative",
      sql`${table.totalOvertimeMinutes} >= 0`,
    ),
  }),
);

export const payrollCostSummaries = pgTable(
  "payroll_cost_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollPeriodId: uuid("payroll_period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    employmentType: employmentTypeEnum("employment_type"),
    totalGross: numeric("total_gross", { precision: 14, scale: 2 }).notNull(),
    totalNet: numeric("total_net", { precision: 14, scale: 2 }).notNull(),
    totalEmployerContributions: numeric("total_employer_contributions", {
      precision: 14,
      scale: 2,
    })
      .default("0")
      .notNull(),
    employeeCount: integer("employee_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPayrollPeriod: index("idx_payroll_cost_period").on(
      table.payrollPeriodId,
    ),
    chkEmployeeCount: check(
      "chk_payroll_cost_summaries_employee_count",
      sql`${table.employeeCount} >= 0`,
    ),
    chkTotalGrossNonNegative: check(
      "chk_payroll_cost_summaries_total_gross_non_negative",
      sql`${table.totalGross} >= 0`,
    ),
    chkTotalNetNonNegative: check(
      "chk_payroll_cost_summaries_total_net_non_negative",
      sql`${table.totalNet} >= 0`,
    ),
    chkEmployerContribNonNegative: check(
      "chk_payroll_cost_summaries_employer_contrib_non_negative",
      sql`${table.totalEmployerContributions} >= 0`,
    ),
  }),
);
