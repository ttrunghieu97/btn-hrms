import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  taskActivityActionEnum,
  taskDependencyTypeEnum,
  taskDomainEventTypeEnum,
  taskPriorityEnum,
  taskStatusEnum,
} from "./enums";
import { employees } from "../workforce/tables";
import { departments } from "../org/tables";
import { users } from "../identity/tables";

// 10i. Task Templates (declared before tasks due to forward ref)
export const taskTemplates = pgTable(
  "task_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    checklist: jsonb("checklist"),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    defaultAssigneeId: uuid("default_assignee_id").references(
      () => employees.id,
      { onDelete: "set null" },
    ),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").default(true).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxDepartment: index("idx_task_templates_department_id").on(table.departmentId),
    idxDefaultAssignee: index("idx_task_templates_default_assignee_id").on(table.defaultAssigneeId),
  }),
);

// 10d. Tasks
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("created").notNull(),
    progress: numeric("progress", { precision: 5, scale: 2 })
      .default("0")
      .notNull(),
    resultText: text("result_text"),
    checklist: text("checklist"),

    assigneeId: uuid("assignee_id").references(() => employees.id, {
      onDelete: "set null",
    }),

    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    templateId: uuid("template_id").references((): any => taskTemplates.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id").references((): any => tasks.id, {
      onDelete: "set null",
    }),

    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),

    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    rejectionReason: text("rejection_reason"),
    revisionReason: text("revision_reason"),
    cancellationReason: text("cancellation_reason"),

    revisionCount: integer("revision_count").default(0).notNull(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxCompanyStatus: index("idx_tasks_company_status")
      .on(table.status)
      .where(sql`${table.deletedAt} is null`),
    idxStatus: index("idx_tasks_status").on(table.status),
    idxAssignee: index("idx_tasks_assignee_id").on(table.assigneeId),
    idxCreatedBy: index("idx_tasks_created_by_user_id").on(table.createdByUserId),
    idxTemplate: index("idx_tasks_template_id").on(table.templateId),
    idxParentTask: index("idx_tasks_parent_task_id").on(table.parentTaskId),
    idxDueDate: index("idx_tasks_due_date").on(table.dueDate),
    idxPriority: index("idx_tasks_priority").on(table.priority),
  }),
);

// 10d. Task Notifications
export const taskNotifications = pgTable(
  "task_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // e.g. task_assigned
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxUser: index("idx_task_notifications_user_id").on(table.userId),
    idxTask: index("idx_task_notifications_task_id").on(table.taskId),
    idxRead: index("idx_task_notifications_is_read").on(table.isRead),
  }),
);

// 10b. Task Assignments (history)
export const taskAssignments = pgTable(
  "task_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_assignments_task_id").on(table.taskId),
    idxEmployee: index("idx_task_assignments_employee_id").on(table.employeeId),
  }),
);

// 10e. Task Activities
export const taskActivities = pgTable(
  "task_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: taskActivityActionEnum("action").notNull(),
    fromStatus: taskStatusEnum("from_status"),
    toStatus: taskStatusEnum("to_status"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_activities_task_id").on(table.taskId),
    idxActor: index("idx_task_activities_actor").on(table.actorUserId),
  }),
);

// 10f. Task Comments
export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_comments_task_id").on(table.taskId),
    idxAuthor: index("idx_task_comments_author_user_id").on(table.authorUserId),
  }),
);

// 10g. Task Attachments
export const taskAttachments = pgTable(
  "task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fileName: text("file_name").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    size: integer("size"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_attachments_task_id").on(table.taskId),
    idxUploadedBy: index("idx_task_attachments_uploaded_by").on(
      table.uploadedByUserId,
    ),
  }),
);

// 10h. Task Submissions
export const taskSubmissions = pgTable(
  "task_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull(),
    resultText: text("result_text"),
    checklist: jsonb("checklist"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_submissions_task_id").on(table.taskId),
    idxSubmittedBy: index("idx_task_submissions_submitted_by").on(
      table.submittedByUserId,
    ),
    uqTaskVersion: unique("uq_task_submissions_task_version").on(
      table.taskId,
      table.version,
    ),
  }),
);

// 10j. Task Recurrences
export const taskRecurrences = pgTable(
  "task_recurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => taskTemplates.id, { onDelete: "cascade" }),
    cronExpression: text("cron_expression").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastCreatedTaskId: uuid("last_created_task_id").references(
      (): any => tasks.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxActiveNextRun: index("idx_task_recurrences_active_next_run").on(
      table.isActive,
      table.nextRunAt,
    ),
    idxLastTask: index("idx_task_recurrences_last_task_id").on(
      table.lastCreatedTaskId,
    ),
  }),
);

// 10k. Task Dependencies
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references((): any => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references((): any => tasks.id, { onDelete: "cascade" }),
    type: taskDependencyTypeEnum("type").default("blocks").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxTask: index("idx_task_deps_task_id").on(table.taskId),
    idxDependsOn: index("idx_task_deps_depends_on").on(table.dependsOnTaskId),
    uqTaskDeps: unique("uq_task_deps").on(table.taskId, table.dependsOnTaskId),
  }),
);

// 10l. Task SLA Rules
export const taskSlaRules = pgTable("task_sla_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  priority: taskPriorityEnum("priority").notNull().unique(),
  maxDurationMinutes: integer("max_duration_minutes").notNull(),
  notifyBeforeMinutes: integer("notify_before_minutes"),
  approvalLatencyMinutes: integer("approval_latency_minutes"),
  maxRevisionCount: integer("max_revision_count"),
  escalateToUserId: uuid("escalate_to_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  idxEscalateTo: index("idx_task_sla_rules_escalate_to").on(
    table.escalateToUserId,
  ),
}));

// 10m. Task Delegations
export const taskDelegations = pgTable("task_delegations", {
  id: uuid("id").defaultRandom().primaryKey(),
  delegatorUserId: uuid("delegator_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  delegateeUserId: uuid("delegatee_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** When set, delegation applies to all tasks assigned to employees in this department. */
  departmentId: uuid("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  idxDelegator: index("idx_task_delegations_delegator").on(
    table.delegatorUserId,
  ),
  idxDelegatee: index("idx_task_delegations_delegatee").on(
    table.delegateeUserId,
  ),
  idxDepartment: index("idx_task_delegations_department").on(
    table.departmentId,
  ),
  idxActive: index("idx_task_delegations_is_active").on(table.isActive),
}));

// Task Events
export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    globalSequence: bigserial("global_sequence", { mode: "number" }),
    aggregateId: uuid("aggregate_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    eventType: taskDomainEventTypeEnum("event_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull().default({}),
    correlationId: uuid("correlation_id"),
    causationId: uuid("causation_id"),
    sequence: integer("sequence").notNull().default(0),
    processed: boolean("processed").notNull().default(false),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxAggregate: index("idx_task_events_aggregate_id").on(table.aggregateId),
    idxEventType: index("idx_task_events_event_type").on(table.eventType),
    idxActor: index("idx_task_events_actor_user_id").on(table.actorUserId),
    idxOccurredAt: index("idx_task_events_occurred_at").on(table.occurredAt),
    idxGlobalSequence: index("idx_task_events_global_sequence").on(
      table.globalSequence,
    ),
  }),
);
