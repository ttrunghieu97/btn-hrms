import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  index,
  unique,
  uniqueIndex,
  check,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employees } from "../workforce/tables";
import { branches } from "../org/tables";
import { users } from "../identity/tables";
import {
  payFrequencyEnum,
  payrollPeriodStatusEnum,
  payrollRunStatusEnum,
  payslipStatusEnum,
  payrollItemTypeEnum,
  statutoryContributionTypeEnum,
} from "./enums";
import { employmentTypeEnum } from "../workforce/enums";

export const payrolls = pgTable(
  "payrolls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    salary: numeric("salary", { precision: 14, scale: 2 }).notNull(),
    bonus: numeric("bonus", { precision: 14, scale: 2 }).default("0").notNull(),
    deduction: numeric("deduction", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    allowance: numeric("allowance", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    overtimeAmount: numeric("overtime_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    insuranceAmount: numeric("insurance_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    netSalary: numeric("net_salary", { precision: 14, scale: 2 }),
    currency: text("currency").default("VND").notNull(),

    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    payrollPeriodId: uuid("payroll_period_id").references(
      () => payrollPeriods.id,
      {
        onDelete: "set null",
      },
    ),
    payrollRunId: uuid("payroll_run_id").references(() => payrollRuns.id, {
      onDelete: "set null",
    }),
    // Soft reference by design to avoid a circular FK during payroll creation.
    payslipId: uuid("payslip_id"),
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_payrolls_employee_id").on(table.employeeId),
    idxPayrollPeriod: index("idx_payrolls_payroll_period_id").on(
      table.payrollPeriodId,
    ),
    idxPayrollRun: index("idx_payrolls_payroll_run_id").on(table.payrollRunId),
    idxPayslip: index("idx_payrolls_payslip_id").on(table.payslipId),
    chkDateRange: check(
      "chk_payrolls_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

export const salaryStructures = pgTable(
  "salary_structures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    currency: text("currency").default("VND").notNull(),
    payFrequency: payFrequencyEnum("pay_frequency")
      .default("monthly")
      .notNull(),
    baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull(),
    components: jsonb("components"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    isCurrent: boolean("is_current").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_salary_structures_employee_id").on(
      table.employeeId,
    ),
    idxCurrent: index("idx_salary_structures_is_current").on(table.isCurrent),
    uqCurrentEmployee: uniqueIndex("uq_salary_structures_current_employee")
      .on(table.employeeId)
      .where(sql`${table.isCurrent} = true`),
    chkDateRange: check(
      "chk_salary_structures_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

export const payrollPeriods = pgTable(
  "payroll_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    payDate: date("pay_date"),
    status: payrollPeriodStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxStatus: index("idx_payroll_periods_status").on(table.status),
    uqCompanyCode: unique("uq_payroll_periods_company_code").on(
      table.code,
    ),
    chkDateRange: check(
      "chk_payroll_periods_date_range",
      sql`${table.startsOn} <= ${table.endsOn}`,
    ),
  }),
);

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollPeriodId: uuid("payroll_period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    status: payrollRunStatusEnum("status").default("draft").notNull(),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPayrollPeriod: index("idx_payroll_runs_payroll_period_id").on(
      table.payrollPeriodId,
    ),
    idxBranch: index("idx_payroll_runs_branch_id").on(table.branchId),
    idxStatus: index("idx_payroll_runs_status").on(table.status),
    idxApprovedBy: index("idx_payroll_runs_approved_by_user_id").on(
      table.approvedByUserId,
    ),
    uqPeriodBranch: unique("uq_payroll_runs_period_branch").on(
      table.payrollPeriodId,
      table.branchId,
    ),
  }),
);

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    grossPay: numeric("gross_pay", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    netPay: numeric("net_pay", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    currency: text("currency").default("VND").notNull(),
    status: payslipStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPayrollRun: index("idx_payslips_payroll_run_id").on(table.payrollRunId),
    idxEmployee: index("idx_payslips_employee_id").on(table.employeeId),
    idxStatus: index("idx_payslips_status").on(table.status),
    uqPayrollRunEmployee: unique("uq_payslips_payroll_run_employee").on(
      table.payrollRunId,
      table.employeeId,
    ),
  }),
);

export const payrollItems = pgTable(
  "payroll_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    payslipId: uuid("payslip_id").references(() => payslips.id, {
      onDelete: "set null",
    }),
    type: payrollItemTypeEnum("type").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    rate: numeric("rate", { precision: 10, scale: 2 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPayrollRun: index("idx_payroll_items_payroll_run_id").on(
      table.payrollRunId,
    ),
    idxEmployee: index("idx_payroll_items_employee_id").on(table.employeeId),
    idxPayslip: index("idx_payroll_items_payslip_id").on(table.payslipId),
    idxType: index("idx_payroll_items_type").on(table.type),
  }),
);

export const taxBrackets = pgTable(
  "tax_brackets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    bracketOrder: integer("bracket_order").notNull(),
    minIncome: numeric("min_income", { precision: 14, scale: 2 }).notNull(),
    maxIncome: numeric("max_income", { precision: 14, scale: 2 }),
    rate: numeric("rate", { precision: 5, scale: 4 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEffectiveDate: index("idx_tax_brackets_effective_date").on(
      table.effectiveFrom,
      table.effectiveTo,
    ),
    uqCompanyBracketVersion: unique("uq_tax_brackets_company_order_from").on(
      table.bracketOrder,
      table.effectiveFrom,
    ),
    chkRate: check(
      "chk_tax_brackets_rate",
      sql`${table.rate} >= 0 and ${table.rate} <= 1`,
    ),
    chkMinIncome: check(
      "chk_tax_brackets_min_income",
      sql`${table.minIncome} >= 0`,
    ),
    chkIncomeRange: check(
      "chk_tax_brackets_income_range",
      sql`${table.maxIncome} is null or ${table.maxIncome} >= ${table.minIncome}`,
    ),
    chkEffectiveRange: check(
      "chk_tax_brackets_effective_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

export const statutoryContributionRules = pgTable(
  "statutory_contribution_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contributionType:
      statutoryContributionTypeEnum("contribution_type").notNull(),
    employmentType: employmentTypeEnum("employment_type"),
    employeeRate: numeric("employee_rate", {
      precision: 5,
      scale: 4,
    }).notNull(),
    employerRate: numeric("employer_rate", {
      precision: 5,
      scale: 4,
    }).notNull(),
    salaryCap: numeric("salary_cap", { precision: 14, scale: 2 }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEffectiveDate: index("idx_statutory_rules_effective_date").on(
      table.effectiveFrom,
      table.effectiveTo,
    ),
    chkEmployeeRate: check(
      "chk_statutory_rules_employee_rate",
      sql`${table.employeeRate} >= 0 and ${table.employeeRate} <= 1`,
    ),
    chkEmployerRate: check(
      "chk_statutory_rules_employer_rate",
      sql`${table.employerRate} >= 0 and ${table.employerRate} <= 1`,
    ),
    chkSalaryCap: check(
      "chk_statutory_rules_salary_cap",
      sql`${table.salaryCap} is null or ${table.salaryCap} >= 0`,
    ),
    chkEffectiveRange: check(
      "chk_statutory_rules_effective_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);
