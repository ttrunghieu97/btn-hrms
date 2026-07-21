import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  attendanceSessionEnum,
  attendanceSessionTypeEnum,
  attendanceSessionStatusEnum,
  attendanceTypeEnum,
  attendanceSummaryStatusEnum,
  leaveRequestStatusEnum,
  leaveSessionEnum,
  leaveUnitEnum,
  overtimeStatusEnum,
  punchVerificationStatusEnum,
  attendanceOverrideReasonEnum,
  attendanceEventTypeEnum,
  attendanceEventSourceEnum,
  attendanceSourceEnum,
  lunchDutyTypeEnum,
  attendanceExceptionTypeEnum,
  attendanceExceptionStatusEnum,
} from "./enums";
import { employees } from "../workforce/tables";
import { branches, locations } from "../org/tables";
import { users } from "../identity/tables";

// GPS Logs
export const gpsLogs = pgTable(
  "gps_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),

    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_gps_logs_employee_id").on(table.employeeId),
    idxTimestamp: index("idx_gps_logs_timestamp").on(table.timestamp),
  }),
);

// 10. Attendances: Daily check-in/out records
export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    sessionId: uuid("session_id")
      .references(() => attendanceSessions.id, { onDelete: "set null" }),

    type: attendanceTypeEnum("type").notNull(),

    time: timestamp("time", { withTimezone: true }).notNull(),
    date: date("date").notNull(), // for easy daily grouping

    // "morning" | "noon" | "afternoon" (used by the web app)
    session: attendanceSessionEnum("session"),

    source: attendanceSourceEnum("source").default("api"),

    image: text("image"),
    location: text("location"),
    locationId: uuid("location_id").references(
      () => locations.id,
      {
        onDelete: "set null",
      },
    ),
    note: text("note"),
    lunchDutyType: lunchDutyTypeEnum("lunch_duty_type"),

    // ── punch verification (spec §2 PunchEvent) ────────────────────
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    distanceMeters: integer("distance_meters"),
    ipAddress: text("ip_address"),
    selfieS3Key: text("selfie_s3_key"),
    verificationStatus: punchVerificationStatusEnum("verification_status"),
    /**
     * Per-event flags surfaced by verification pipeline.
     * Shape:
     * {
     *   outsideGeofence?: boolean,
     *   ipNotWhitelisted?: boolean,
     *   selfieLowConfidence?: boolean,
     *   selfieMissing?: boolean
     * }
     */
    flags: jsonb("flags"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendances_employee_id").on(table.employeeId),
    idxDate: index("idx_attendances_date").on(table.date),

    idxEmployeeDate: index("idx_attendances_employee_date").on(
      table.employeeId,
      table.date,
    ),
    idxEmployeeTime: index("idx_attendances_employee_time").on(
      table.employeeId,
      table.time,
    ),

    idxType: index("idx_attendances_type").on(table.type),
    idxSession: index("idx_attendances_session").on(table.session),
    idxLocation: index("idx_attendances_location_id").on(
      table.locationId,
    ),
    idxVerification: index("idx_attendances_verification_status").on(
      table.verificationStatus,
    ),

    // Prevent duplicate check-ins for the same employee/date/session/type
    uqEmployeeDateSessionType: unique(
      "uq_attendances_employee_date_session_type",
    ).on(table.employeeId, table.date, table.session, table.type),
  }),
);


// 10c. Attendance Sessions -- Aggregate Root for work sessions
export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    assignmentId: text("assignment_id"),

    sessionType: attendanceSessionTypeEnum("session_type").notNull(),
    status: attendanceSessionStatusEnum("status").default("READY").notNull(),

    date: date("date").notNull(),

    plannedStart: text("planned_start"),
    plannedEnd: text("planned_end"),

    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),

    timezone: text("timezone").default("Asia/Ho_Chi_Minh"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_sessions_employee").on(table.employeeId),
    idxDate: index("idx_attendance_sessions_date").on(table.date),
    idxStatus: index("idx_attendance_sessions_status").on(table.status),
    idxEmployeeDate: index("idx_attendance_sessions_employee_date").on(
      table.employeeId,
      table.date,
    ),
    uqActiveSession: uniqueIndex("uq_attendance_active_session")
      .on(table.employeeId)
      .where(sql`status = 'IN_PROGRESS'`),
  }),
);

// 10b. Leave Management
export const leavePolicies = pgTable(
  "leave_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxBranch: index("idx_leave_policies_branch_id").on(table.branchId),
    uqCompanyCode: unique("uq_leave_policies_company_code").on(
      table.code,
    ),
    chkDateRange: check(
      "chk_leave_policies_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

export const leaveTypes = pgTable(
  "leave_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id").references(() => leavePolicies.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: leaveUnitEnum("unit").default("day").notNull(),
    isPaid: boolean("is_paid").default(true).notNull(),
    requiresApproval: boolean("requires_approval").default(true).notNull(),
    maxDaysPerYear: numeric("max_days_per_year", { precision: 8, scale: 2 }),
    minNoticeHours: integer("min_notice_hours"),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPolicy: index("idx_leave_types_policy_id").on(table.policyId),
    uqCompanyCode: unique("uq_leave_types_company_code").on(
      table.code,
    ),
  }),
);

export const leavePolicyAssignments = pgTable(
  "leave_policy_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => leavePolicies.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPolicy: index("idx_leave_policy_assignments_policy_id").on(
      table.policyId,
    ),
    idxEmployee: index("idx_leave_policy_assignments_employee_id").on(
      table.employeeId,
    ),
    chkDateRange: check(
      "chk_leave_policy_assignments_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
    uqEmployeeCurrentPolicyAssignment: uniqueIndex(
      "uq_leave_policy_assignments_current_employee",
    )
      .on(table.employeeId)
      .where(sql`${table.effectiveTo} is null`),
  }),
);

export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "cascade" }),
    balanceYear: integer("balance_year").notNull(),
    openingBalance: numeric("opening_balance", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    accruedAmount: numeric("accrued_amount", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    usedAmount: numeric("used_amount", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    carriedOverAmount: numeric("carried_over_amount", {
      precision: 8,
      scale: 2,
    })
      .default("0")
      .notNull(),
    adjustedAmount: numeric("adjusted_amount", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_leave_balances_employee_id").on(table.employeeId),
    idxLeaveType: index("idx_leave_balances_leave_type_id").on(
      table.leaveTypeId,
    ),
    uqEmployeeTypeYear: unique("uq_leave_balances_employee_type_year").on(
      table.employeeId,
      table.leaveTypeId,
      table.balanceYear,
    ),
  }),
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "restrict" }),
    approverUserId: uuid("approver_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: leaveRequestStatusEnum("status").default("pending").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startSession: leaveSessionEnum("start_session")
      .default("full_day")
      .notNull(),
    endSession: leaveSessionEnum("end_session").default("full_day").notNull(),
    totalUnits: numeric("total_units", { precision: 8, scale: 2 }).notNull(),
    reason: text("reason"),
    note: text("note"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_leave_requests_employee_id").on(table.employeeId),
    idxLeaveType: index("idx_leave_requests_leave_type_id").on(
      table.leaveTypeId,
    ),
    idxApprover: index("idx_leave_requests_approver_user_id").on(
      table.approverUserId,
    ),
    idxStatus: index("idx_leave_requests_status").on(table.status),
    chkDateRange: check(
      "chk_leave_requests_date_range",
      sql`${table.startDate} <= ${table.endDate}`,
    ),
  }),
);

export const attendanceDailySummaries = pgTable(
  "attendance_daily_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    employeeShiftAssignmentId: uuid("employee_shift_assignment_id"),
    leaveRequestId: uuid("leave_request_id").references(
      () => leaveRequests.id,
      {
        onDelete: "set null",
      },
    ),
    workDate: date("work_date").notNull(),
    status: attendanceSummaryStatusEnum("status").default("present").notNull(),
    scheduledMinutes: integer("scheduled_minutes").default(0).notNull(),
    workedMinutes: integer("worked_minutes").default(0).notNull(),
    breakMinutes: integer("break_minutes").default(0).notNull(),
    lateMinutes: integer("late_minutes").default(0).notNull(),
    earlyLeaveMinutes: integer("early_leave_minutes").default(0).notNull(),
    overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
    isHoliday: boolean("is_holiday").default(false).notNull(),
    anomalyFlags: jsonb("anomaly_flags"),
    sourceData: jsonb("source_data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_daily_summaries_employee_id").on(
      table.employeeId,
    ),
    idxShiftAssignment: index(
      "idx_attendance_daily_summaries_shift_assignment_id",
    ).on(table.employeeShiftAssignmentId),
    idxLeaveRequest: index(
      "idx_attendance_daily_summaries_leave_request_id",
    ).on(table.leaveRequestId),
    idxEmployeeShift: index("idx_attendance_daily_summaries_employee_shift").on(
      table.employeeId,
      table.employeeShiftAssignmentId,
    ),
    uqEmployeeDate: unique("uq_attendance_daily_summaries_employee_date").on(
      table.employeeId,
      table.workDate,
    ),
  }),
);

export const attendanceExceptions = pgTable(
  "attendance_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDailySummaryId: uuid("attendance_daily_summary_id").references(
      () => attendanceDailySummaries.id,
      { onDelete: "set null" },
    ),
    workDate: date("work_date").notNull(),
    type: attendanceExceptionTypeEnum("type").notNull(),
    status: attendanceExceptionStatusEnum("status").default("pending").notNull(),
    relatedEventIds: jsonb("related_event_ids"),
    resolutionNote: text("resolution_note"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_exceptions_employee_id").on(
      table.employeeId,
    ),
    idxWorkDate: index("idx_attendance_exceptions_work_date").on(
      table.workDate,
    ),
    idxStatus: index("idx_attendance_exceptions_status").on(table.status),
    idxSummary: index("idx_attendance_exceptions_summary_id").on(
      table.attendanceDailySummaryId,
    ),
    idxResolvedBy: index("idx_attendance_exceptions_resolved_by").on(
      table.resolvedByUserId,
    ),
    uqEmployeeDateType: unique("uq_attendance_exceptions_employee_date_type").on(
      table.employeeId,
      table.workDate,
      table.type,
    ),
  }),
);

export const attendanceOvertimeRequests = pgTable(
  "attendance_overtime_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    candidateMinutes: integer("candidate_minutes").default(0).notNull(),
    requestedMinutes: integer("requested_minutes").notNull(),
    approvedMinutes: integer("approved_minutes").default(0).notNull(),
    status: overtimeStatusEnum("status").default("pending").notNull(),
    requestNote: text("request_note"),
    rejectionReason: text("rejection_reason"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_ot_employee_id").on(table.employeeId),
    idxWorkDate: index("idx_attendance_ot_work_date").on(table.workDate),
    idxStatus: index("idx_attendance_ot_status").on(table.status),
    idxApprovedBy: index("idx_attendance_ot_approved_by").on(
      table.approvedByUserId,
    ),
    uqEmployeeDate: unique("uq_attendance_ot_employee_date").on(
      table.employeeId,
      table.workDate,
    ),
  }),
);

/**
 * Non-destructive HR overrides for attendance daily summaries.
 * Overrides are applied at read-time only — the base computation
 * in attendance_daily_summaries is never modified.
 * Each row patches specific fields; null fields = no override.
 */
export const attendanceSummaryOverrides = pgTable(
  "attendance_summary_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    reason: attendanceOverrideReasonEnum("reason").notNull(),
    note: text("note"),

    // Overridable fields (null = use base value from summaries)
    overriddenStatus: attendanceSummaryStatusEnum("overridden_status"),
    overriddenWorkedMinutes: integer("overridden_worked_minutes"),
    overriddenLateMinutes: integer("overridden_late_minutes"),
    overriddenEarlyLeaveMinutes: integer("overridden_early_leave_minutes"),
    overriddenOvertimeMinutes: integer("overridden_overtime_minutes"),

    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_summary_overrides_employee_id").on(
      table.employeeId,
    ),
    idxWorkDate: index("idx_attendance_summary_overrides_work_date").on(
      table.workDate,
    ),
    idxEmployeeDate: index(
      "idx_attendance_summary_overrides_employee_date",
    ).on(table.employeeId, table.workDate),
    uqEmployeeDate: unique("uq_attendance_summary_overrides_employee_date").on(
      table.employeeId,
      table.workDate,
    ),
  }),
);

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: attendanceEventTypeEnum("type").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    source: attendanceEventSourceEnum("source").default("DEVICE").notNull(),
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_attendance_events_employee_id").on(table.employeeId),
    idxTimestamp: index("idx_attendance_events_timestamp").on(table.timestamp),
    idxEmployeeDate: index("idx_attendance_events_employee_date").on(
      table.employeeId,
      table.timestamp,
    ),
  }),
);
