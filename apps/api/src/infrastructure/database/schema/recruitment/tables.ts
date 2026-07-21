import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  requisitionStatusEnum,
  postingStatusEnum,
  applicationStageEnum,
  offerStatusEnum,
} from "./enums";
import {
  interviewTypeEnum,
  interviewStatusEnum,
} from "./enums";
import { departments } from "../org/tables";
import { employees, positions } from "../workforce/tables";
import { users } from "../identity/tables";
import { files } from "../_shared/files";


/**
 * Job requisition — a hiring request that must be approved before a posting is published.
 * Lifecycle: draft → pending_approval → approved → rejected | closed.
 */
export const jobRequisitions = pgTable(
  "job_requisitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    positionId: uuid("position_id").references(() => positions.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    headcount: integer("headcount").notNull().default(1),
    budgetMin: numeric("budget_min", { precision: 14, scale: 2 }),
    budgetMax: numeric("budget_max", { precision: 14, scale: 2 }),
    justification: text("justification"),
    status: requisitionStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    idxDepartment: index("idx_job_requisitions_department_id").on(
      t.departmentId,
    ),
    idxStatus: index("idx_job_requisitions_status").on(t.status),
    chkHeadcount: check(
      "chk_job_requisitions_headcount",
      sql`${t.headcount} >= 1`,
    ),
    chkBudgetRange: check(
      "chk_job_requisitions_budget_range",
      sql`${t.budgetMin} is null or ${t.budgetMax} is null or ${t.budgetMin} <= ${t.budgetMax}`,
    ),
  }),
);

/** Interview scheduling. */
export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    interviewType: interviewTypeEnum("interview_type").notNull(),
    status: interviewStatusEnum("status").default("scheduled").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").default(60),
    location: text("location"),
    meetingLink: text("meeting_link"),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxInterviewApplication: index("idx_interviews_application").on(t.applicationId),
    idxInterviewStatus: index("idx_interviews_status").on(t.status),
  }),
);

/**
 * Job posting — an approved requisition published to receive applications.
 * Lifecycle: open ↔ paused → closed.
 */
export const jobPostings = pgTable(
  "job_postings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => jobRequisitions.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    requirements: text("requirements"),
    status: postingStatusEnum("status").notNull().default("open"),
    openedAt: date("opened_at"),
    closesAt: date("closes_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    idxRequisition: index("idx_job_postings_requisition_id").on(
      t.requisitionId,
    ),
    idxStatus: index("idx_job_postings_status").on(t.status),
  }),
);

/**
 * Candidate — one profile per normalized email. A person may apply to many postings.
 */
export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxEmail: index("idx_candidates_email").on(t.email),
  }),
);

/**
 * Application — a candidate applying to a posting; carries the current pipeline stage.
 */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    currentStage: applicationStageEnum("current_stage")
      .notNull()
      .default("applied"),
    cvFileId: uuid("cv_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxCandidate: index("idx_applications_candidate_id").on(t.candidateId),
    idxPosting: index("idx_applications_posting_id").on(t.postingId),
    idxStage: index("idx_applications_current_stage").on(t.currentStage),
    uqCandidatePosting: unique("uq_applications_candidate_posting").on(
      t.candidateId,
      t.postingId,
    ),
  }),
);

/**
 * Application stage event — immutable, append-only history of stage transitions.
 */
export const applicationStageEvents = pgTable(
  "application_stage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStage: applicationStageEnum("from_stage"),
    toStage: applicationStageEnum("to_stage").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxApplication: index("idx_application_stage_events_application_id").on(
      t.applicationId,
    ),
  }),
);

export const interviewRubricScores = pgTable(
  "interview_rubric_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scorecardId: uuid("scorecard_id")
      .notNull()
      .references(() => interviewScorecards.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    score: integer("score").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxRubricScorecard: index("idx_rubric_scorecard").on(t.scorecardId),
    uqCategoryScorecard: unique("uq_rubric_category_scorecard").on(t.scorecardId, t.category),
    chkRubricScore: check("chk_rubric_score", sql`${t.score} between 1 and 5`),
  }),
);

/**
 * Interview scorecard — one rating/feedback per interviewer for an application.
 */
export const interviewScorecards = pgTable(
  "interview_scorecards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    interviewerUserId: uuid("interviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxApplication: index("idx_interview_scorecards_application_id").on(
      t.applicationId,
    ),
    uqApplicationInterviewer: unique(
      "uq_interview_scorecards_application_interviewer",
    ).on(t.applicationId, t.interviewerUserId),
    chkRating: check(
      "chk_interview_scorecards_rating",
      sql`${t.rating} between 1 and 5`,
    ),
  }),
);

/**
 * Offer — drafted for an application in the offer stage, approved via the approval engine,
 * then accepted/declined by the candidate.
 * Lifecycle: draft → pending_approval → approved → rejected | accepted | declined.
 */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    compensation: numeric("compensation", { precision: 14, scale: 2 }).notNull(),
    startDate: date("start_date").notNull(),
    expiresAt: date("expires_at"),
    status: offerStatusEnum("status").notNull().default("draft"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    idxApplication: index("idx_offers_application_id").on(t.applicationId),
    idxStatus: index("idx_offers_status").on(t.status),
  }),
);
