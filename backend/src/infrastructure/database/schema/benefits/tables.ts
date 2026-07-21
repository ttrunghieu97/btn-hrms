import {
  pgTable, uuid, text, timestamp, integer, numeric, date, boolean,
  index, unique, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

// ── Enums ──
export const benefitPlanStatusEnum = {
  draft: "draft", published: "published", closed: "closed",
} as const;
export type BenefitPlanStatus = (typeof benefitPlanStatusEnum)[keyof typeof benefitPlanStatusEnum];

export const benefitCoverageTypeEnum = {
  employee_only: "employee_only", employee_plus_one: "employee_plus_one",
  family: "family",
} as const;
export type BenefitCoverageType = (typeof benefitCoverageTypeEnum)[keyof typeof benefitCoverageTypeEnum];

export const enrollmentStatusEnum = {
  pending: "pending", approved: "approved",
  active: "active", cancelled: "cancelled", terminated: "terminated",
} as const;
export type EnrollmentStatus = (typeof enrollmentStatusEnum)[keyof typeof enrollmentStatusEnum];

// ── Tables ──

/** Benefit provider (insurance company, etc.) */
export const benefitProviders = pgTable(
  "benefit_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

/** A benefit plan offered to employees. */
export const benefitPlans = pgTable(
  "benefit_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    providerId: uuid("provider_id").references(() => benefitProviders.id),
    coverageType: text("coverage_type", { enum: ["employee_only","employee_plus_one","family"] }).notNull(),
    employerContribution: numeric("employer_contribution", { precision: 14, scale: 2 }).default("0").notNull(),
    employeeContribution: numeric("employee_contribution", { precision: 14, scale: 2 }).default("0").notNull(),
    status: text("status", { enum: ["draft","published","closed"] }).default("draft").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    maxEligibleAge: integer("max_eligible_age"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxPlanStatus: index("idx_benefit_plans_status").on(t.status),
    idxPlanProvider: index("idx_benefit_plans_provider").on(t.providerId),
  }),
);

/** Eligibility rules for a plan. */
export const benefitEligibilityRules = pgTable(
  "benefit_eligibility_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id").notNull().references(() => benefitPlans.id, { onDelete: "cascade" }),
    employmentStatus: text("employment_status"),
    employmentType: text("employment_type"),
    minTenureMonths: integer("min_tenure_months"),
    departmentId: uuid("department_id"),
    locationId: uuid("location_id"),
    excludeProbation: boolean("exclude_probation").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqPlan: unique("uq_benefit_eligibility_plan").on(t.planId),
  }),
);

/** Employee enrollment in a benefit plan. */
export const benefitEnrollments = pgTable(
  "benefit_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id").notNull().references(() => benefitPlans.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    coverageType: text("coverage_type", { enum: ["employee_only","employee_plus_one","family"] }).notNull(),
    status: text("status", { enum: ["pending","approved","active","cancelled","terminated"] }).default("pending").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    employerContribution: numeric("employer_contribution", { precision: 14, scale: 2 }),
    employeeContribution: numeric("employee_contribution", { precision: 14, scale: 2 }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    terminatedAt: timestamp("terminated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxEnrollPlan: index("idx_benefit_enrollments_plan").on(t.planId),
    idxEnrollEmployee: index("idx_benefit_enrollments_employee").on(t.employeeId),
    uqEnrollActive: unique("uq_benefit_enrollments_active").on(t.planId, t.employeeId),
    chkCoverage: check("chk_enrollment_coverage", sql`${t.coverageType} in ('employee_only','employee_plus_one','family')`),
  }),
);

/** Dependents on an enrollment. */
export const benefitDependents = pgTable(
  "benefit_dependents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id").notNull().references(() => benefitEnrollments.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    relationship: text("relationship").notNull(),
    dateOfBirth: date("date_of_birth"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxDepEnrollment: index("idx_benefit_dependents_enrollment").on(t.enrollmentId),
  }),
);
