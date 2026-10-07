import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  date,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { departments } from "../org/tables";
import { employees, positions } from "../workforce/tables";
import { users } from "../identity/tables";
import { assigneeTypeEnum } from "../tasks/enums";
import {
  boardingTypeEnum,
  boardingProcessStatusEnum,
  checklistItemStatusEnum,
} from "./enums";

export const boardingTemplates = pgTable(
  "boarding_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: boardingTypeEnum("type").notNull(),
    departmentId: uuid("department_id").references(() => departments.id),
    positionId: uuid("position_id").references(() => positions.id),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxType: index("idx_boarding_templates_type").on(table.type),
  }),
);

export const boardingTemplateItems = pgTable(
  "boarding_template_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => boardingTemplates.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 255 }),
    assigneeType: assigneeTypeEnum("assignee_type").notNull(),
    defaultAssigneeUserId: uuid("default_assignee_user_id").references(
      () => users.id,
    ),
    dueDaysOffset: integer("due_days_offset"),
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxTemplate: index("idx_boarding_template_items_template").on(
      table.templateId,
    ),
  }),
);

export const boardingProcesses = pgTable(
  "boarding_processes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => boardingTemplates.id),
    type: boardingTypeEnum("type").notNull(),
    status: boardingProcessStatusEnum("status").default("pending").notNull(),
    startDate: date("start_date").notNull(),
    targetEndDate: date("target_end_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    assignedHrUserId: uuid("assigned_hr_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxEmployee: index("idx_boarding_processes_employee").on(table.employeeId),
    idxStatus: index("idx_boarding_processes_status").on(table.status),
    idxType: index("idx_boarding_processes_type").on(table.type),
  }),
);

export const boardingChecklistItems = pgTable(
  "boarding_checklist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => boardingProcesses.id, { onDelete: "cascade" }),

    // Snapshot fields from template item (immutable after creation)
    title: varchar("title", { length: 255 }).notNull(),
    dueDaysOffset: integer("due_days_offset").notNull().default(0),
    mandatory: boolean("mandatory").notNull().default(true),

    templateItemId: uuid("template_item_id").references(
      () => boardingTemplateItems.id,
    ),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id),
    status: checklistItemStatusEnum("status").default("pending").notNull(),
    dueDate: date("due_date"),
    isCompleted: boolean("is_completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserID: uuid("completed_by_user_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxProcess: index("idx_boarding_checklist_items_process").on(table.processId),
    idxStatus: index("idx_boarding_checklist_items_status").on(table.status),
  }),
);

export const exitInterviews = pgTable(
  "exit_interviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => boardingProcesses.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    interviewerUserId: uuid("interviewer_user_id").references(() => users.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    conductedAt: timestamp("conducted_at", { withTimezone: true }),
    responses: jsonb("responses").$type<Record<string, unknown>>(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxProcess: index("idx_exit_interviews_process").on(table.processId),
    idxEmployee: index("idx_exit_interviews_employee").on(table.employeeId),
  }),
);
