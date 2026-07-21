import { relations } from "drizzle-orm";
import {
  companies,
  branches,
  locations,
  departments,
  businessUnits,
  costCenters,
} from "./tables";
import {
  employees,
  positions,
} from "../workforce/tables";
import { tasks, taskTemplates } from "../tasks/tables";
import {
  holidayCalendars,
  shiftTemplates,
  employeeShiftAssignments,
} from "../scheduling/tables";
import { leavePolicies, leaveTypes } from "../attendance/tables";
import { payrollPeriods, payrollRuns } from "../payroll/tables";

export const companiesRelations = relations(companies, ({ many }) => ({
  branches: many(branches),
  departments: many(departments),
  employees: many(employees),
  tasks: many(tasks),
  taskTemplates: many(taskTemplates),
  holidayCalendars: many(holidayCalendars),
  leavePolicies: many(leavePolicies),
  leaveTypes: many(leaveTypes),
  shiftTemplates: many(shiftTemplates),
  payrollPeriods: many(payrollPeriods),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  locations: many(locations),
  departments: many(departments),
  employees: many(employees),
  holidayCalendars: many(holidayCalendars),
  leavePolicies: many(leavePolicies),
  shiftTemplates: many(shiftTemplates),
  payrollRuns: many(payrollRuns),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  branch: one(branches, {
    fields: [locations.branchId],
    references: [branches.id],
  }),
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: "locations_hierarchy",
  }),
  children: many(locations, {
    relationName: "locations_hierarchy",
  }),
  employees: many(employees),
  shiftTemplates: many(shiftTemplates),
  employeeShiftAssignments: many(employeeShiftAssignments),
}));
export const departmentsRelations = relations(departments, ({ many, one }) => ({
  branch: one(branches, {
    fields: [departments.branchId],
    references: [branches.id],
  }),
  employees: many(employees),
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: "department_hierarchy",
  }),
  subDepartments: many(departments, {
    relationName: "department_hierarchy",
  }),
}));

export const businessUnitsRelations = relations(
  businessUnits,
  ({ one, many }) => ({
    headPosition: one(positions, {
      fields: [businessUnits.headPositionId],
      references: [positions.id],
    }),
    departments: many(departments),
  }),
);

export const costCentersRelations = relations(
  costCenters,
  ({ one, many }) => ({
    budgetOwnerPosition: one(positions, {
      fields: [costCenters.budgetOwnerPositionId],
      references: [positions.id],
    }),
    departments: many(departments),
    positions: many(positions),
  }),
);
