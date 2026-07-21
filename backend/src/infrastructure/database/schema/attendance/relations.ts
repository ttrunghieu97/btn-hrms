import { relations } from "drizzle-orm";
import {
  attendances,
  attendanceDailySummaries,
  attendanceExceptions,
  attendanceOvertimeRequests,
  attendanceSummaryOverrides,
  gpsLogs,
  leaveBalances,
  leavePolicies,
  leavePolicyAssignments,
  leaveRequests,
  leaveTypes,
} from "./tables";
import { employees } from "../workforce/tables";
import { branches, locations } from "../org/tables";
import { users } from "../identity/tables";
import { employeeShiftAssignments } from "../scheduling/tables";

export const gpsLogsRelations = relations(gpsLogs, ({ one }) => ({
  employee: one(employees, {
    fields: [gpsLogs.employeeId],
    references: [employees.id],
  }),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  employee: one(employees, {
    fields: [attendances.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [attendances.locationId],
    references: [locations.id],
  }),
}));

export const leavePoliciesRelations = relations(
  leavePolicies,
  ({ one, many }) => ({
    branch: one(branches, {
      fields: [leavePolicies.branchId],
      references: [branches.id],
    }),
    leaveTypes: many(leaveTypes),
    assignments: many(leavePolicyAssignments),
  }),
);

export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  policy: one(leavePolicies, {
    fields: [leaveTypes.policyId],
    references: [leavePolicies.id],
  }),
  balances: many(leaveBalances),
  requests: many(leaveRequests),
}));

export const leavePolicyAssignmentsRelations = relations(
  leavePolicyAssignments,
  ({ one }) => ({
    policy: one(leavePolicies, {
      fields: [leavePolicyAssignments.policyId],
      references: [leavePolicies.id],
    }),
    employee: one(employees, {
      fields: [leavePolicyAssignments.employeeId],
      references: [employees.id],
    }),
  }),
);

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveBalances.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveBalances.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

export const leaveRequestsRelations = relations(
  leaveRequests,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [leaveRequests.employeeId],
      references: [employees.id],
    }),
    leaveType: one(leaveTypes, {
      fields: [leaveRequests.leaveTypeId],
      references: [leaveTypes.id],
    }),
    approver: one(users, {
      fields: [leaveRequests.approverUserId],
      references: [users.id],
    }),
    attendanceDailySummaries: many(attendanceDailySummaries),
  }),
);

export const attendanceDailySummariesRelations = relations(
  attendanceDailySummaries,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [attendanceDailySummaries.employeeId],
      references: [employees.id],
    }),
    employeeShiftAssignment: one(employeeShiftAssignments, {
      fields: [attendanceDailySummaries.employeeShiftAssignmentId],
      references: [employeeShiftAssignments.id],
    }),
    leaveRequest: one(leaveRequests, {
      fields: [attendanceDailySummaries.leaveRequestId],
      references: [leaveRequests.id],
    }),
    exceptions: many(attendanceExceptions),
  }),
);

export const attendanceExceptionsRelations = relations(
  attendanceExceptions,
  ({ one }) => ({
    employee: one(employees, {
      fields: [attendanceExceptions.employeeId],
      references: [employees.id],
    }),
    attendanceSummary: one(attendanceDailySummaries, {
      fields: [attendanceExceptions.attendanceDailySummaryId],
      references: [attendanceDailySummaries.id],
    }),
    resolvedByUser: one(users, {
      fields: [attendanceExceptions.resolvedByUserId],
      references: [users.id],
    }),
  }),
);

export const attendanceOvertimeRequestsRelations = relations(
  attendanceOvertimeRequests,
  ({ one }) => ({
    employee: one(employees, {
      fields: [attendanceOvertimeRequests.employeeId],
      references: [employees.id],
    }),
    approvedBy: one(users, {
      fields: [attendanceOvertimeRequests.approvedByUserId],
      references: [users.id],
    }),
  }),
);

export const attendanceSummaryOverridesRelations = relations(
  attendanceSummaryOverrides,
  ({ one }) => ({
    employee: one(employees, {
      fields: [attendanceSummaryOverrides.employeeId],
      references: [employees.id],
    }),
    createdByUser: one(users, {
      fields: [attendanceSummaryOverrides.createdByUserId],
      references: [users.id],
    }),
  }),
);
