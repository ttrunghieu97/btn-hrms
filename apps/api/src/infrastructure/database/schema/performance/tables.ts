import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  date,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

// ──────────────────────────────────────────────
// Enums (raw strings for schema simplicity)
// ──────────────────────────────────────────────

export const performanceCycleStatusEnum = {
  draft: "draft",
  planning: "planning",
  self_review: "self_review",
  manager_review: "manager_review",
  calibration: "calibration",
  ready_for_approval: "ready_for_approval",
  approved: "approved",
  published: "published",
  closed: "closed",
} as const;
export type PerformanceCycleStatus = (typeof performanceCycleStatusEnum)[keyof typeof performanceCycleStatusEnum];

export const goalStatusEnum = {
  draft: "draft",
  submitted: "submitted",
  approved: "approved",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type GoalStatus = (typeof goalStatusEnum)[keyof typeof goalStatusEnum];

export const reviewAssignmentTypeEnum = {
  self: "self",
  manager: "manager",
  peer: "peer",
  subordinate: "subordinate",
  committee: "committee",
} as const;
export type ReviewAssignmentType = (typeof reviewAssignmentTypeEnum)[keyof typeof reviewAssignmentTypeEnum];

export const reviewAssignmentStatusEnum = {
  pending: "pending",
  in_progress: "in_progress",
  submitted: "submitted",
} as const;
export type ReviewAssignmentStatus = (typeof reviewAssignmentStatusEnum)[keyof typeof reviewAssignmentStatusEnum];

// ──────────────────────────────────────────────
// Tables
// ──────────────────────────────────────────────

export const performanceCycles = pgTable(
  "performance_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: text("status", { enum: ["draft","planning","self_review","manager_review","calibration","ready_for_approval","approved","published","closed"] })
      .default("draft")
      .notNull(),
    config: jsonb("config").$type<{
      selfReviewRequired: boolean;
      managerReviewRequired: boolean;
      calibrationRequired: boolean;
      approvalPolicyId: string | null;
      ratingScale: {
        type: "numeric_1_5" | "numeric_1_4" | "letter_a_d" | "custom";
        labels: Record<string, string>;
      };
      competencies: { id: string; name: string; description: string | null }[];
    }>(),
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
    idxCycleStatus: index("idx_perf_cycles_status").on(table.status),
    idxCycleDates: index("idx_perf_cycles_dates").on(table.startsOn, table.endsOn),
  }),
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => performanceCycles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft","submitted","approved","completed","cancelled"] })
      .default("draft")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxGoalCycle: index("idx_goals_cycle").on(table.cycleId),
  }),
);

/** Key results for a goal (quantifiable outcomes). */
export const goalKeyResults = pgTable(
  "goal_key_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetValue: numeric("target_value", { precision: 14, scale: 2 }),
    currentValue: numeric("current_value", { precision: 14, scale: 2 }),
    unit: text("unit"),
    status: text("status").default("not_started").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxKRGoal: index("idx_kr_goal").on(table.goalId),
  }),
);

/** Links a goal to one or more employees (shared goals support). */
export const goalAssignments = pgTable(
  "goal_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    weight: numeric("weight", { precision: 5, scale: 2 }).default("1").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqGoalEmployee: unique("uq_goal_assignments_goal_employee").on(
      table.goalId,
      table.employeeId,
    ),
    idxGAEmployee: index("idx_ga_employee").on(table.employeeId),
    idxGACycle: index("idx_ga_cycle").on(table.goalId),
  }),
);

/** A review assignment links a reviewer to a review subject for a cycle. */
export const reviewAssignments = pgTable(
  "review_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => performanceCycles.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")             // subject
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    reviewType: text("review_type", {
      enum: ["self","manager","peer","subordinate","committee"],
    }).notNull(),
    status: text("status", {
      enum: ["pending","in_progress","submitted"],
    })
      .default("pending")
      .notNull(),
    dueDate: date("due_date"),
    overallComment: text("overall_comment"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqReviewerSubject: unique("uq_review_assignments_reviewer_subject").on(
      table.cycleId,
      table.employeeId,
      table.reviewerId,
      table.reviewType,
    ),
    idxRACycle: index("idx_ra_cycle").on(table.cycleId),
    idxRAEmployee: index("idx_ra_employee").on(table.employeeId),
    idxRAReviewer: index("idx_ra_reviewer").on(table.reviewerId),
  }),
);

/** Individual competency ratings within a review. */
export const reviewRatings = pgTable(
  "review_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewAssignmentId: uuid("review_assignment_id")
      .notNull()
      .references(() => reviewAssignments.id, { onDelete: "cascade" }),
    competencyId: text("competency_id").notNull(),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxRRReview: index("idx_rr_review").on(table.reviewAssignmentId),
  }),
);

/** Final result for an employee in a cycle (after approval). */
export const performanceResults = pgTable(
  "performance_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => performanceCycles.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    finalScore: numeric("final_score", { precision: 5, scale: 2 }),
    ratingLabel: text("rating_label"),
    summary: text("summary"),
    promotionRecommendation: text("promotion_recommendation"),
    pipAction: text("pip_action"),
    salaryAdjustmentNote: text("salary_adjustment_note"),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqResultCycleEmployee: unique("uq_perf_results_cycle_employee").on(
      table.cycleId,
      table.employeeId,
    ),
    idxPRCycle: index("idx_pr_cycle").on(table.cycleId),
    idxPREmployee: index("idx_pr_employee").on(table.employeeId),
  }),
);
