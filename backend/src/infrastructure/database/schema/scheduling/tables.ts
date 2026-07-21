import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { weekdayEnum, shiftAssignmentStatusEnum, scheduleRequestTypeEnum, scheduleRequestStatusEnum } from "./enums";
import { employees } from "../workforce/tables";
import { branches, departments, locations } from "../org/tables";
import { users } from "../identity/tables";

// 0. Core scheduling model
export const dailySchedules = pgTable(
  "schedules_new",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull().unique(),
    status: text("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: uuid("locked_by").references(() => users.id, {
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
    idxDate: index("idx_schedules_date").on(table.date),
    idxStatus: index("idx_schedules_status").on(table.status),
  }),
);

export const scheduleRequirements = pgTable(
  "schedule_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => dailySchedules.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    workRoleId: uuid("work_role_id").references(() => workRoles.id, {
      onDelete: "set null",
    }),
    shiftTemplateId: uuid("shift_template_id").references(
      () => shiftTemplates.id,
      { onDelete: "set null" },
    ),
    requiredCount: integer("required_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxReqSchedule: index("idx_req_schedule").on(table.scheduleId),
    idxReqLocation: index("idx_req_location").on(table.locationId),
    idxReqRole: index("idx_req_work_role").on(table.workRoleId),
    idxReqShift: index("idx_req_shift").on(table.shiftTemplateId),
    uqSlot: unique("uq_schedule_requirement_slot").on(
      table.scheduleId,
      table.locationId,
      table.workRoleId,
      table.shiftTemplateId,
    ),
  }),
);

// Add schedule_id to existing assignments
// DB column added via ALTER TABLE, not in Drizzle schema to avoid conflicts
// The column is managed at the DB level, code references it via the existing schema

// 0. Work roles: operational positions for scheduling (separate from org positions)
export const workRoles = pgTable(
  "work_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxName: index("idx_work_roles_name").on(table.name),
  }),
);

// 8. Schedules: Container for work blocks on a specific day
export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),

    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_schedules_employee_id").on(table.employeeId),
  }),
);

// 9. Work Blocks: Specific time slots within a schedule
export const workBlocks = pgTable(
  "work_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),

    dayOfWeek: weekdayEnum("day_of_week").notNull(),

    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),

    note: text("note"),
  },
  (table) => ({
    idxSchedule: index("idx_work_blocks_schedule_id").on(table.scheduleId),

    chkTime: check(
      "chk_work_blocks_time_range",
      sql`${table.startTime} < ${table.endTime}`,
    ),
  }),
);

// 10a. Holiday Calendars
export const holidayCalendars = pgTable(
  "holiday_calendars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    timezone: text("timezone"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxBranch: index("idx_holiday_calendars_branch_id").on(table.branchId),
    uqCompanyCode: unique("uq_holiday_calendars_company_code").on(
      table.code,
    ),
  }),
);

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    holidayCalendarId: uuid("holiday_calendar_id")
      .notNull()
      .references(() => holidayCalendars.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    holidayDate: date("holiday_date").notNull(),
    isPaid: boolean("is_paid").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxCalendar: index("idx_holidays_holiday_calendar_id").on(
      table.holidayCalendarId,
    ),
    uqCalendarDate: unique("uq_holidays_calendar_date").on(
      table.holidayCalendarId,
      table.holidayDate,
    ),
  }),
);

// 10c. Shift Management
export const shiftTemplates = pgTable(
  "shift_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    locationId: uuid("location_id").references(
      () => locations.id,
      {
        onDelete: "set null",
      },
    ),
    holidayCalendarId: uuid("holiday_calendar_id").references(
      () => holidayCalendars.id,
      { onDelete: "set null" },
    ),
    code: text("code").notNull(),
    name: text("name").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    breakMinutes: integer("break_minutes").default(0).notNull(),
    toleranceMinutes: integer("tolerance_minutes").default(0).notNull(),
    workDays: jsonb("work_days"),
    isNightShift: boolean("is_night_shift").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxBranch: index("idx_shift_templates_branch_id").on(table.branchId),
    idxLocation: index("idx_shift_templates_location_id").on(
      table.locationId,
    ),
    uqCompanyCode: unique("uq_shift_templates_company_code").on(
      table.code,
    ),
  }),
);

export const employeeShiftAssignments = pgTable(
  "employee_shift_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftTemplateId: uuid("shift_template_id").references(
      () => shiftTemplates.id,
      { onDelete: "set null" },
    ),
    positionId: uuid("position_id").references(() => workRoles.id, {
      onDelete: "set null",
    }),
    locationId: uuid("location_id").references(
      () => locations.id,
      {
        onDelete: "set null",
      },
    ),
    scheduleId: uuid("schedule_id").references(() => dailySchedules.id, {
      onDelete: "set null",
    }),
    assignmentDate: date("assignment_date").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    status: shiftAssignmentStatusEnum("status").default("planned").notNull(),
    note: text("note"),
    snapshotShiftName: text("snapshot_shift_name"),
    snapshotStartTime: time("snapshot_start_time"),
    snapshotEndTime: time("snapshot_end_time"),
    snapshotBreakMinutes: integer("snapshot_break_minutes"),
    snapshotLocationName: text("snapshot_location_name"),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_employee_shift_assignments_employee_id").on(
      table.employeeId,
    ),
    idxShiftTemplate: index(
      "idx_employee_shift_assignments_shift_template_id",
    ).on(table.shiftTemplateId),
    idxLocation: index(
      "idx_employee_shift_assignments_location_id",
    ).on(table.locationId),
    idxAssignmentDate: index(
      "idx_employee_shift_assignments_assignment_date",
    ).on(table.assignmentDate),
    uqEmployeeDate: unique("uq_employee_shift_assignments_employee_date").on(
      table.employeeId,
      table.assignmentDate,
    ),
  }),
);

export const shiftRosterPublications = pgTable(
  "shift_roster_publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: text("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedByUserId: uuid("rejected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedByUserId: uuid("locked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqRosterPeriod: unique("uq_shift_roster_publications_period").on(
      table.branchId,
      table.departmentId,
      table.periodStart,
      table.periodEnd,
    ),
    idxRosterStatus: index("idx_shift_roster_publications_status").on(table.status),
    idxRosterPeriod: index("idx_shift_roster_publications_period").on(
      table.periodStart,
      table.periodEnd,
    ),
  }),
);

export const employeeQualifications = pgTable(
  "employee_qualifications",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    positionId: uuid("position_id")
      .notNull()
      .references(() => workRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: unique("uq_employee_qualifications").on(table.employeeId, table.positionId),
    idxEmployee: index("idx_employee_qualifications_employee_id").on(table.employeeId),
    idxPosition: index("idx_employee_qualifications_position_id").on(table.positionId),
  }),
);

export const scheduleRequests = pgTable(
  "schedule_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    requestType: scheduleRequestTypeEnum("request_type").notNull(),
    reason: text("reason"),
    status: scheduleRequestStatusEnum("status").default("PENDING").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxRequestEmployee: index("idx_schedule_requests_employee_id").on(table.employeeId),
    idxRequestStatus: index("idx_schedule_requests_status").on(table.status),
    idxRequestDate: index("idx_schedule_requests_date").on(table.date),
  }),
);

export const shiftRosterLifecycleHistory = pgTable(
  "shift_roster_lifecycle_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rosterPublicationId: uuid("roster_publication_id")
      .notNull()
      .references(() => shiftRosterPublications.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxRosterHistoryPublication: index(
      "idx_shift_roster_lifecycle_history_publication_id",
    ).on(table.rosterPublicationId),
  }),
);

export const shiftRosterVersionSnapshots = pgTable(
  "shift_roster_version_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rosterPublicationId: uuid("roster_publication_id")
      .notNull()
      .references(() => shiftRosterPublications.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotData: jsonb("snapshot_data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    uqRosterVersion: unique("uq_shift_roster_version_snapshots_roster_version").on(
      table.rosterPublicationId,
      table.version,
    ),
    idxRosterVersionSnapshotPub: index(
      "idx_shift_roster_version_snapshots_pub_id",
    ).on(table.rosterPublicationId),
  }),
);
