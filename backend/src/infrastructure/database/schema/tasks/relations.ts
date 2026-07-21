import { relations } from "drizzle-orm";
import {
  taskActivities,
  taskAssignments,
  taskAttachments,
  taskComments,
  taskDelegations,
  taskDependencies,
  taskEvents,
  taskNotifications,
  taskRecurrences,
  taskSlaRules,
  taskSubmissions,
  taskTemplates,
  tasks,
} from "./tables";
import { employees } from "../workforce/tables";
import { departments } from "../org/tables";
import { users } from "../identity/tables";

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(employees, {
    fields: [tasks.assigneeId],
    references: [employees.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
  }),
  assignments: many(taskAssignments),
  notifications: many(taskNotifications),
  activities: many(taskActivities),
  comments: many(taskComments),
  attachments: many(taskAttachments),
  submissions: many(taskSubmissions),
  dependencies: many(taskDependencies, { relationName: "task_dependencies" }),
  blockedBy: many(taskDependencies, { relationName: "task_blocked_by" }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  template: one(taskTemplates, {
    fields: [tasks.templateId],
    references: [taskTemplates.id],
  }),
}));

export const taskActivitiesRelations = relations(taskActivities, ({ one }) => ({
  task: one(tasks, {
    fields: [taskActivities.taskId],
    references: [tasks.id],
  }),
  actor: one(users, {
    fields: [taskActivities.actorUserId],
    references: [users.id],
  }),
}));

export const taskAssignmentsRelations = relations(
  taskAssignments,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskAssignments.taskId],
      references: [tasks.id],
    }),
    employee: one(employees, {
      fields: [taskAssignments.employeeId],
      references: [employees.id],
    }),
    assignedBy: one(users, {
      fields: [taskAssignments.assignedByUserId],
      references: [users.id],
    }),
  }),
);

export const taskNotificationsRelations = relations(
  taskNotifications,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskNotifications.taskId],
      references: [tasks.id],
    }),
    user: one(users, {
      fields: [taskNotifications.userId],
      references: [users.id],
    }),
  }),
);

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [taskComments.authorUserId],
    references: [users.id],
  }),
}));

export const taskAttachmentsRelations = relations(
  taskAttachments,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskAttachments.taskId],
      references: [tasks.id],
    }),
    uploadedBy: one(users, {
      fields: [taskAttachments.uploadedByUserId],
      references: [users.id],
    }),
  }),
);

export const taskSubmissionsRelations = relations(
  taskSubmissions,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskSubmissions.taskId],
      references: [tasks.id],
    }),
    submittedBy: one(users, {
      fields: [taskSubmissions.submittedByUserId],
      references: [users.id],
    }),
  }),
);

export const taskDependenciesRelations = relations(
  taskDependencies,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskDependencies.taskId],
      references: [tasks.id],
      relationName: "task_dependencies",
    }),
    dependsOnTask: one(tasks, {
      fields: [taskDependencies.dependsOnTaskId],
      references: [tasks.id],
      relationName: "task_blocked_by",
    }),
  }),
);

export const taskTemplatesRelations = relations(
  taskTemplates,
  ({ one, many }) => ({
    defaultAssignee: one(employees, {
      fields: [taskTemplates.defaultAssigneeId],
      references: [employees.id],
    }),
    department: one(departments, {
      fields: [taskTemplates.departmentId],
      references: [departments.id],
    }),
    createdBy: one(users, {
      fields: [taskTemplates.createdByUserId],
      references: [users.id],
    }),
    tasks: many(tasks),
    recurrences: many(taskRecurrences),
  }),
);

export const taskRecurrencesRelations = relations(
  taskRecurrences,
  ({ one }) => ({
    template: one(taskTemplates, {
      fields: [taskRecurrences.templateId],
      references: [taskTemplates.id],
    }),
    lastCreatedTask: one(tasks, {
      fields: [taskRecurrences.lastCreatedTaskId],
      references: [tasks.id],
    }),
  }),
);

export const taskSlaRulesRelations = relations(taskSlaRules, ({ one }) => ({
  escalateTo: one(users, {
    fields: [taskSlaRules.escalateToUserId],
    references: [users.id],
  }),
}));

export const taskDelegationsRelations = relations(
  taskDelegations,
  ({ one }) => ({
    delegator: one(users, {
      fields: [taskDelegations.delegatorUserId],
      references: [users.id],
      relationName: "delegator",
    }),
    delegatee: one(users, {
      fields: [taskDelegations.delegateeUserId],
      references: [users.id],
      relationName: "delegatee",
    }),
    department: one(departments, {
      fields: [taskDelegations.departmentId],
      references: [departments.id],
    }),
  }),
);

export const taskEventsRelations = relations(taskEvents, ({ one }) => ({
  aggregate: one(tasks, {
    fields: [taskEvents.aggregateId],
    references: [tasks.id],
  }),
  actor: one(users, {
    fields: [taskEvents.actorUserId],
    references: [users.id],
  }),
}));
