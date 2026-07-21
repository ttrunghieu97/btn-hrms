import { relations } from "drizzle-orm";
import {
  salaryStructures,
  payrollPeriods,
  payrollRuns,
  payslips,
  payrollItems,
  taxBrackets,
  statutoryContributionRules,
} from "./tables";
import { employees } from "../workforce/tables";
import { branches } from "../org/tables";
import { users } from "../identity/tables";

export const salaryStructuresRelations = relations(
  salaryStructures,
  ({ one }) => ({
    employee: one(employees, {
      fields: [salaryStructures.employeeId],
      references: [employees.id],
      relationName: "employee_salary_structures",
    }),
  }),
);

export const payrollPeriodsRelations = relations(
  payrollPeriods,
  ({ many }) => ({
    payrollRuns: many(payrollRuns),
  }),
);

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  payrollPeriod: one(payrollPeriods, {
    fields: [payrollRuns.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
  branch: one(branches, {
    fields: [payrollRuns.branchId],
    references: [branches.id],
  }),
  approvedBy: one(users, {
    fields: [payrollRuns.approvedByUserId],
    references: [users.id],
  }),
  payslips: many(payslips),
  payrollItems: many(payrollItems),
}));

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payslips.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  payrollItems: many(payrollItems),
}));

export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payrollItems.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payrollItems.employeeId],
    references: [employees.id],
  }),
  payslip: one(payslips, {
    fields: [payrollItems.payslipId],
    references: [payslips.id],
  }),
}));

export const taxBracketsRelations = relations(taxBrackets, () => ({
}));

export const statutoryContributionRulesRelations = relations(
  statutoryContributionRules,
  () => ({
  }),
);
