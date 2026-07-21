import { relations } from "drizzle-orm";
import {
  dailySchedules,
  employeeQualifications,
  employeeShiftAssignments,
  holidayCalendars,
  holidays,
  scheduleRequests,
  scheduleRequirements,
  schedules,
  shiftTemplates,
  workBlocks,
  workRoles,
  shiftRosterPublications,
  shiftRosterVersionSnapshots,
} from "./tables";
import { employees } from "../workforce/tables";
import { branches, locations } from "../org/tables";
import { users } from "../identity/tables";

export const schedulesRelations = relations(schedules, ({ many, one }) => ({
  employee: one(employees, {
    fields: [schedules.employeeId],
    references: [employees.id],
  }),
  workBlocks: many(workBlocks),
}));

export const workBlocksRelations = relations(workBlocks, ({ one }) => ({
  schedule: one(schedules, {
    fields: [workBlocks.scheduleId],
    references: [schedules.id],
  }),
}));

export const holidayCalendarsRelations = relations(
  holidayCalendars,
  ({ one, many }) => ({
    branch: one(branches, {
      fields: [holidayCalendars.branchId],
      references: [branches.id],
    }),
    holidays: many(holidays),
    shiftTemplates: many(shiftTemplates),
  }),
);

export const holidaysRelations = relations(holidays, ({ one }) => ({
  holidayCalendar: one(holidayCalendars, {
    fields: [holidays.holidayCalendarId],
    references: [holidayCalendars.id],
  }),
}));

export const shiftTemplatesRelations = relations(
  shiftTemplates,
  ({ one, many }) => ({
    branch: one(branches, {
      fields: [shiftTemplates.branchId],
      references: [branches.id],
    }),
    location: one(locations, {
      fields: [shiftTemplates.locationId],
      references: [locations.id],
    }),
    holidayCalendar: one(holidayCalendars, {
      fields: [shiftTemplates.holidayCalendarId],
      references: [holidayCalendars.id],
    }),
    employeeShiftAssignments: many(employeeShiftAssignments),
  }),
);

export const employeeQualificationsRelations = relations(
  employeeQualifications,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeQualifications.employeeId],
      references: [employees.id],
    }),
    position: one(workRoles, {
      fields: [employeeQualifications.positionId],
      references: [workRoles.id],
    }),
  }),
);

export const scheduleRequestsRelations = relations(
  scheduleRequests,
  ({ one }) => ({
    employee: one(employees, {
      fields: [scheduleRequests.employeeId],
      references: [employees.id],
    }),
    reviewer: one(users, {
      fields: [scheduleRequests.reviewedBy],
      references: [users.id],
    }),
  }),
);

export const dailySchedulesRelations = relations(dailySchedules, ({ many }) => ({
  requirements: many(scheduleRequirements),
  assignments: many(employeeShiftAssignments),
}));

export const scheduleRequirementsRelations = relations(
  scheduleRequirements,
  ({ one }) => ({
    schedule: one(dailySchedules, {
      fields: [scheduleRequirements.scheduleId],
      references: [dailySchedules.id],
    }),
    location: one(locations, {
      fields: [scheduleRequirements.locationId],
      references: [locations.id],
    }),
    workRole: one(workRoles, {
      fields: [scheduleRequirements.workRoleId],
      references: [workRoles.id],
    }),
    shiftTemplate: one(shiftTemplates, {
      fields: [scheduleRequirements.shiftTemplateId],
      references: [shiftTemplates.id],
    }),
  }),
);

export const workRolesRelations = relations(
  workRoles,
  ({ many }) => ({
    employeeQualifications: many(employeeQualifications),
  }),
);

export const employeeShiftAssignmentsRelations = relations(
  employeeShiftAssignments,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeShiftAssignments.employeeId],
      references: [employees.id],
    }),
    shiftTemplate: one(shiftTemplates, {
      fields: [employeeShiftAssignments.shiftTemplateId],
      references: [shiftTemplates.id],
    }),
    location: one(locations, {
      fields: [employeeShiftAssignments.locationId],
      references: [locations.id],
    }),
    schedule: one(dailySchedules, {
      fields: [employeeShiftAssignments.scheduleId],
      references: [dailySchedules.id],
    }),
  }),
);

export const shiftRosterPublicationsRelations = relations(
  shiftRosterPublications,
  ({ many }) => ({
    versionSnapshots: many(shiftRosterVersionSnapshots),
  })
);

export const shiftRosterVersionSnapshotsRelations = relations(
  shiftRosterVersionSnapshots,
  ({ one }) => ({
    publication: one(shiftRosterPublications, {
      fields: [shiftRosterVersionSnapshots.rosterPublicationId],
      references: [shiftRosterPublications.id],
    }),
    creator: one(users, {
      fields: [shiftRosterVersionSnapshots.createdByUserId],
      references: [users.id],
    }),
  })
);
