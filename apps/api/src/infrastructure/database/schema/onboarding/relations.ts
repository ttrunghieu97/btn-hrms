import { relations } from "drizzle-orm";
import {
  boardingTemplates,
  boardingTemplateItems,
  boardingProcesses,
  boardingChecklistItems,
  exitInterviews,
} from "./tables";
import { departments } from "../org/tables";
import { employees, positions } from "../workforce/tables";
import { users } from "../identity/tables";

export const boardingTemplatesRelations = relations(
  boardingTemplates,
  ({ one, many }) => ({
    department: one(departments, {
      fields: [boardingTemplates.departmentId],
      references: [departments.id],
    }),
    position: one(positions, {
      fields: [boardingTemplates.positionId],
      references: [positions.id],
    }),
    items: many(boardingTemplateItems),
    processes: many(boardingProcesses),
  }),
);

export const boardingTemplateItemsRelations = relations(
  boardingTemplateItems,
  ({ one, many }) => ({
    template: one(boardingTemplates, {
      fields: [boardingTemplateItems.templateId],
      references: [boardingTemplates.id],
    }),
    defaultAssigneeUser: one(users, {
      fields: [boardingTemplateItems.defaultAssigneeUserId],
      references: [users.id],
    }),
    checklistItems: many(boardingChecklistItems),
  }),
);

export const boardingProcessesRelations = relations(
  boardingProcesses,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [boardingProcesses.employeeId],
      references: [employees.id],
    }),
    template: one(boardingTemplates, {
      fields: [boardingProcesses.templateId],
      references: [boardingTemplates.id],
    }),
    assignedHrUser: one(users, {
      fields: [boardingProcesses.assignedHrUserId],
      references: [users.id],
    }),
    checklistItems: many(boardingChecklistItems),
    exitInterviews: many(exitInterviews),
  }),
);

export const boardingChecklistItemsRelations = relations(
  boardingChecklistItems,
  ({ one }) => ({
    process: one(boardingProcesses, {
      fields: [boardingChecklistItems.processId],
      references: [boardingProcesses.id],
    }),
    templateItem: one(boardingTemplateItems, {
      fields: [boardingChecklistItems.templateItemId],
      references: [boardingTemplateItems.id],
    }),
    assigneeUser: one(users, {
      fields: [boardingChecklistItems.assigneeUserId],
      references: [users.id],
    }),
    completedByUser: one(users, {
      fields: [boardingChecklistItems.completedByUserID],
      references: [users.id],
      relationName: "boarding_checklist_completed_by",
    }),
  }),
);

export const exitInterviewsRelations = relations(exitInterviews, ({ one }) => ({
  process: one(boardingProcesses, {
    fields: [exitInterviews.processId],
    references: [boardingProcesses.id],
  }),
  employee: one(employees, {
    fields: [exitInterviews.employeeId],
    references: [employees.id],
  }),
  interviewer: one(users, {
    fields: [exitInterviews.interviewerUserId],
    references: [users.id],
  }),
}));
