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
import { approvalRequestStatusEnum, approvalStepStatusEnum } from "./enums";
import { users } from "../identity/tables";

export const approvalPolicies = pgTable(
  "approval_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name"),
    description: text("description"),
    steps: jsonb("steps").$type<Record<string, unknown>>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uqKeyVersion: unique("uq_approval_policies_key_version").on(
      t.key,
      t.version,
    ),
    idxKey: index("idx_approval_policies_key").on(t.key),
    idxActive: index("idx_approval_policies_is_active").on(t.isActive),
  }),
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => approvalPolicies.id, { onDelete: "restrict" }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    status: approvalRequestStatusEnum("status").notNull().default("pending"),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxPolicy: index("idx_approval_requests_policy_id").on(t.policyId),
    idxSubject: index("idx_approval_requests_subject").on(
      t.subjectType,
      t.subjectId,
    ),
    idxStatus: index("idx_approval_requests_status").on(t.status),
  }),
);

export const approvalSteps = pgTable(
  "approval_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    status: approvalStepStatusEnum("status").notNull().default("pending"),
    approverUserId: uuid("approver_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    comment: text("comment"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxRequest: index("idx_approval_steps_request_id").on(t.requestId),
    uqRequestStep: unique("uq_approval_steps_request_step").on(
      t.requestId,
      t.stepIndex,
    ),
    idxStatus: index("idx_approval_steps_status").on(t.status),
    idxApprover: index("idx_approval_steps_approver_user_id").on(
      t.approverUserId,
    ),
  }),
);
