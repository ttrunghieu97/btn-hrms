import { relations } from "drizzle-orm";
import {
  employees,
  employeeStatusHistory,
  employmentRecords,
  employeeContracts,
  orgAssignments,
  employeeDocuments,
  certifications,
  employeeEducations,
  positions,
  jobAssignments,
  employeeCompensations,
  employeeIdentifiers,
  allowances,
  socialInsuranceEnrollments,
} from "./tables";
import {
  branches,
  departments,
  locations,
} from "../org/tables";
import { files } from "../_shared/files";
import { users } from "../identity/tables";
import { salaryStructures, payslips, payrollItems } from "../payroll/tables";
import { schedules, employeeShiftAssignments, employeeQualifications, workRoles } from "../scheduling/tables";
import {
  attendances,
  attendanceDailySummaries,
  gpsLogs,
  leavePolicyAssignments,
  leaveBalances,
  leaveRequests,
} from "../attendance/tables";
import { tasks } from "../tasks/tables";

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [employees.branchId],
    references: [branches.id],
  }),
  location: one(locations, {
    fields: [employees.locationId],
    references: [locations.id],
  }),
  currentEmploymentRecord: one(employmentRecords, {
    fields: [employees.currentEmploymentRecordId],
    references: [employmentRecords.id],
    relationName: "employee_current_employment_record",
  }),
  currentOrgAssignment: one(orgAssignments, {
    fields: [employees.currentOrgAssignmentId],
    references: [orgAssignments.id],
    relationName: "employee_current_org_assignment",
  }),
  currentSalaryStructure: one(salaryStructures, {
    fields: [employees.currentSalaryStructureId],
    references: [salaryStructures.id],
    relationName: "employee_current_salary_structure",
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  avatarFile: one(files, {
    fields: [employees.avatarFileId],
    references: [files.id],
  }),
  documents: many(employeeDocuments),
  certifications: many(certifications),
  educations: many(employeeEducations),
  schedules: many(schedules),
  attendances: many(attendances),
  leavePolicyAssignments: many(leavePolicyAssignments),
  leaveBalances: many(leaveBalances),
  leaveRequests: many(leaveRequests),
  employeeShiftAssignments: many(employeeShiftAssignments),
  attendanceDailySummaries: many(attendanceDailySummaries),
  statusHistory: many(employeeStatusHistory),
  employmentRecords: many(employmentRecords, {
    relationName: "employee_employment_records",
  }),
  contracts: many(employeeContracts),
  orgAssignments: many(orgAssignments, {
    relationName: "employee_org_assignments",
  }),
  jobAssignments: many(jobAssignments),
  tasks: many(tasks),
  salaryStructures: many(salaryStructures, {
    relationName: "employee_salary_structures",
  }),
  payslips: many(payslips),
  payrollItems: many(payrollItems),
  gpsLogs: many(gpsLogs),
  allowances: many(allowances),
  socialInsuranceEnrollments: many(socialInsuranceEnrollments),
}));

export const employeeStatusHistoryRelations = relations(
  employeeStatusHistory,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeStatusHistory.employeeId],
      references: [employees.id],
    }),
    actor: one(users, {
      fields: [employeeStatusHistory.changedBy],
      references: [users.id],
    }),
  }),
);

export const employmentRecordsRelations = relations(
  employmentRecords,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [employmentRecords.employeeId],
      references: [employees.id],
      relationName: "employee_employment_records",
    }),
    manager: one(employees, {
      fields: [employmentRecords.managerEmployeeId],
      references: [employees.id],
      relationName: "employment_record_manager",
    }),
    contracts: many(employeeContracts),
  }),
);

export const employeeContractsRelations = relations(
  employeeContracts,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeContracts.employeeId],
      references: [employees.id],
    }),
    employmentRecord: one(employmentRecords, {
      fields: [employeeContracts.employmentRecordId],
      references: [employmentRecords.id],
    }),
  }),
);

export const orgAssignmentsRelations = relations(orgAssignments, ({ one }) => ({
  employee: one(employees, {
    fields: [orgAssignments.employeeId],
    references: [employees.id],
    relationName: "employee_org_assignments",
  }),
  department: one(departments, {
    fields: [orgAssignments.departmentId],
    references: [departments.id],
  }),
  manager: one(employees, {
    fields: [orgAssignments.managerEmployeeId],
    references: [employees.id],
    relationName: "org_assignment_manager",
  }),
}));

export const employeeDocumentsRelations = relations(
  employeeDocuments,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeDocuments.employeeId],
      references: [employees.id],
    }),
    file: one(files, {
      fields: [employeeDocuments.fileId],
      references: [files.id],
    }),
  }),
);

export const employeeEducationsRelations = relations(
  employeeEducations,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeEducations.employeeId],
      references: [employees.id],
    }),
    document: one(files, {
      fields: [employeeEducations.documentId],
      references: [files.id],
    }),
  }),
);

export const certificationsRelations = relations(certifications, ({ one }) => ({
  employee: one(employees, {
    fields: [certifications.employeeId],
    references: [employees.id],
  }),
  file: one(files, {
    fields: [certifications.fileId],
    references: [files.id],
  }),
}));

export const positionsRelations = relations(
  positions,
  ({ many }) => ({
    assignments: many(jobAssignments),
  }),
);

export const jobAssignmentsRelations = relations(
  jobAssignments,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [jobAssignments.employeeId],
      references: [employees.id],
    }),
    position: one(positions, {
      fields: [jobAssignments.positionId],
      references: [positions.id],
    }),
    compensations: many(employeeCompensations),
  }),
);

export const employeeCompensationsRelations = relations(
  employeeCompensations,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeCompensations.employeeId],
      references: [employees.id],
    }),
    jobAssignment: one(jobAssignments, {
      fields: [employeeCompensations.jobAssignmentId],
      references: [jobAssignments.id],
    }),
  }),
);

export const employeeIdentifiersRelations = relations(
  employeeIdentifiers,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeIdentifiers.employeeId],
      references: [employees.id],
    }),
  }),
);
export const allowancesRelations = relations(allowances, ({ one }) => ({
  employee: one(employees, {
    fields: [allowances.employeeId],
    references: [employees.id],
  }),
}));

export const socialInsuranceEnrollmentsRelations = relations(
  socialInsuranceEnrollments,
  ({ one }) => ({
    employee: one(employees, {
      fields: [socialInsuranceEnrollments.employeeId],
      references: [employees.id],
    }),
  }),
);

