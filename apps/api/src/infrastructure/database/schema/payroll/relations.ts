import { relations } from "drizzle-orm";
import {
  salaryStructures,
  payrollPeriods,
  payrollRuns,
  payslips,
  payrollItems,
  taxBrackets,
  statutoryContributionRules,
  payrollInputSnapshots,
  payrollInputSnapshotItems,
  payrollCalculationVersions,
  payrollCalculationMetadata,
  payrollRunApprovalHistory,
  payrollExportHistory,
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
    relationName: "approved_by_user",
  }),
  postedBy: one(users, {
    fields: [payrollRuns.postedByUserId],
    references: [users.id],
    relationName: "posted_by_user",
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

export const payrollCalculationVersionsRelations = relations(
  payrollCalculationVersions,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [payrollCalculationVersions.createdByUserId],
      references: [users.id],
    }),
  }),
);

export const payrollCalculationMetadataRelations = relations(
  payrollCalculationMetadata,
  ({ one }) => ({
    payrollRun: one(payrollRuns, {
      fields: [payrollCalculationMetadata.payrollRunId],
      references: [payrollRuns.id],
    }),
  }),
);

export const payrollInputSnapshotsRelations = relations(
  payrollInputSnapshots,
  ({ one, many }) => ({
    payrollRun: one(payrollRuns, {
      fields: [payrollInputSnapshots.payrollRunId],
      references: [payrollRuns.id],
    }),
    employee: one(employees, {
      fields: [payrollInputSnapshots.employeeId],
      references: [employees.id],
    }),
    generatedBy: one(users, {
      fields: [payrollInputSnapshots.generatedByUserId],
      references: [users.id],
    }),
    items: many(payrollInputSnapshotItems),
  }),
);

export const payrollExportHistoryRelations = relations(
  payrollExportHistory,
  ({ one }) => ({
    payrollRun: one(payrollRuns, {
      fields: [payrollExportHistory.payrollRunId],
      references: [payrollRuns.id],
    }),
    performedBy: one(users, {
      fields: [payrollExportHistory.performedByUserId],
      references: [users.id],
    }),
  }),
);

export const payrollRunApprovalHistoryRelations = relations(
  payrollRunApprovalHistory,
  ({ one }) => ({
    payrollRun: one(payrollRuns, {
      fields: [payrollRunApprovalHistory.payrollRunId],
      references: [payrollRuns.id],
    }),
    performedBy: one(users, {
      fields: [payrollRunApprovalHistory.performedByUserId],
      references: [users.id],
    }),
  }),
);

export const payrollInputSnapshotItemsRelations = relations(
  payrollInputSnapshotItems,
  ({ one }) => ({
    snapshot: one(payrollInputSnapshots, {
      fields: [payrollInputSnapshotItems.snapshotId],
      references: [payrollInputSnapshots.id],
    }),
  }),
);
