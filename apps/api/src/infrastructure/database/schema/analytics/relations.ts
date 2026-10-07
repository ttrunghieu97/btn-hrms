import { relations } from "drizzle-orm";
import {
  headcountSnapshots,
  attendanceMonthlyAggregates,
  payrollCostSummaries,
} from "./tables";
import { branches, departments } from "../org/tables";
import { employees } from "../workforce/tables";
import { payrollPeriods } from "../payroll/tables";

export const headcountSnapshotsRelations = relations(
  headcountSnapshots,
  ({ one }) => ({
    branch: one(branches, {
      fields: [headcountSnapshots.branchId],
      references: [branches.id],
    }),
    department: one(departments, {
      fields: [headcountSnapshots.departmentId],
      references: [departments.id],
    }),
  }),
);

export const attendanceMonthlyAggregatesRelations = relations(
  attendanceMonthlyAggregates,
  ({ one }) => ({
    employee: one(employees, {
      fields: [attendanceMonthlyAggregates.employeeId],
      references: [employees.id],
    }),
  }),
);

export const payrollCostSummariesRelations = relations(
  payrollCostSummaries,
  ({ one }) => ({
    payrollPeriod: one(payrollPeriods, {
      fields: [payrollCostSummaries.payrollPeriodId],
      references: [payrollPeriods.id],
    }),
    branch: one(branches, {
      fields: [payrollCostSummaries.branchId],
      references: [branches.id],
    }),
    department: one(departments, {
      fields: [payrollCostSummaries.departmentId],
      references: [departments.id],
    }),
  }),
);
