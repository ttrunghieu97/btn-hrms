import {
  pgTable, uuid, text, timestamp, integer, date, boolean, index, unique,
} from "drizzle-orm/pg-core";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft","published","archived"] }).default("draft").notNull(),
    estimatedHours: integer("estimated_hours"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ idxStatus: index("idx_courses_status").on(t.status) }),
);

export const learningAssignments = pgTable(
  "learning_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    dueDate: date("due_date"),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqCourseEmployee: unique("uq_learning_assignments_course_employee").on(t.courseId, t.employeeId),
    idxEmp: index("idx_learning_assignments_employee").on(t.employeeId),
  }),
);

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["enrolled","in_progress","completed","cancelled"] }).default("enrolled").notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqEnroll: unique("uq_course_enrollments_course_employee").on(t.courseId, t.employeeId),
    idxEnrollEmp: index("idx_course_enrollments_employee").on(t.employeeId),
    idxEnrollStatus: index("idx_course_enrollments_status").on(t.status),
  }),
);

export const courseSessions = pgTable(
  "course_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft","published","cancelled","completed"] }).default("draft").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").default(60),
    location: text("location"),
    meetingUrl: text("meeting_url"),
    maxAttendees: integer("max_attendees"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxSessionCourse: index("idx_sessions_course").on(t.courseId),
    idxSessionStatus: index("idx_sessions_status").on(t.status),
    idxSessionDate: index("idx_sessions_date").on(t.scheduledAt),
  }),
);

export const sessionInstructors = pgTable(
  "session_instructors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => courseSessions.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    role: text("role").default("instructor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqSessionInstructor: unique("uq_session_instructors_session_employee").on(t.sessionId, t.employeeId),
  }),
);

export const sessionAttendees = pgTable(
  "session_attendees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => courseSessions.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["registered","attended","completed","withdrawn"] }).default("registered").notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqSessionAttendee: unique("uq_session_attendees_session_employee").on(t.sessionId, t.employeeId),
    idxAttendeeEmp: index("idx_session_attendees_employee").on(t.employeeId),
  }),
);


export const certificationDefinitions = pgTable(
  "certification_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    issuer: text("issuer"),
    validityMonths: integer("validity_months"),
    status: text("status", { enum: ["active","inactive"] }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const employeeCertifications = pgTable(
  "employee_certifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    definitionId: uuid("definition_id").notNull().references(() => certificationDefinitions.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    certificateNumber: text("certificate_number"),
    status: text("status", { enum: ["active","expired","revoked"] }).default("active").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxCertEmployee: index("idx_employee_certifications_employee").on(t.employeeId),
    idxCertDef: index("idx_employee_certifications_definition").on(t.definitionId),
    idxCertStatus: index("idx_employee_certifications_status").on(t.status),
    uqCertNumber: unique("uq_certificate_number").on(t.certificateNumber),
  }),
);


export const learningPaths = pgTable(
  "learning_paths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft","published","archived"] }).default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ idxPathStatus: index("idx_learning_paths_status").on(t.status) }),
);

export const learningPathCourses = pgTable(
  "learning_path_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pathId: uuid("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").default(0).notNull(),
    required: boolean("required").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqPathCourse: unique("uq_path_courses_path_course").on(t.pathId, t.courseId),
    idxOrder: index("idx_path_courses_order").on(t.pathId, t.orderIndex),
  }),
);

export const learningPathAssignments = pgTable(
  "learning_path_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pathId: uuid("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["active","completed","cancelled"] }).default("active").notNull(),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqPathAssignment: unique("uq_learning_path_assignments_path_employee").on(t.pathId, t.employeeId),
    idxLPAEmployee: index("idx_lpa_employee").on(t.employeeId),
  }),
);

export const learningPathProgress = pgTable(
  "learning_path_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pathId: uuid("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqPathProgress: unique("uq_learning_path_progress_path_employee_course").on(t.pathId, t.employeeId, t.courseId),
    idxLPPEmployee: index("idx_lpp_employee").on(t.employeeId),
  }),
);

