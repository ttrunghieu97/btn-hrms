import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workflowInstanceStatusEnum } from "./enums";
import { users } from "../identity/tables";

export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name"),
    initialState: text("initial_state").notNull(),
    states: jsonb("states").$type<Record<string, unknown>>().notNull(),
    transitions: jsonb("transitions").$type<Record<string, unknown>>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uqKeyVersion: unique("uq_workflow_definitions_key_version").on(
      t.key,
      t.version,
    ),
    idxKey: index("idx_workflow_definitions_key").on(t.key),
    idxActive: index("idx_workflow_definitions_is_active").on(t.isActive),
  }),
);

export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    currentState: text("current_state").notNull(),
    status: workflowInstanceStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxDefinition: index("idx_workflow_instances_definition_id").on(
      t.definitionId,
    ),
    idxSubject: index("idx_workflow_instances_subject").on(
      t.subjectType,
      t.subjectId,
    ),
    idxStatus: index("idx_workflow_instances_status").on(t.status),
  }),
);

export const workflowInstanceTransitions = pgTable(
  "workflow_instance_transitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "cascade" }),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    transition: text("transition").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxInstance: index(
      "idx_workflow_instance_transitions_instance_id",
    ).on(t.instanceId),
    idxOccurredAt: index(
      "idx_workflow_instance_transitions_occurred_at",
    ).on(t.occurredAt),
  }),
);
