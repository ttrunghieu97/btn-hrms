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
import { AttendancePeriodStatus, AttendancePeriodStatusType } from "./constants";
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
  attendancePeriodLockStatusEnum,
  reconciliationStatusEnum,
  reconciliationDiffTypeEnum,
  attendanceAdjustmentStatusEnum,
  attendanceAdjustmentFieldEnum,
} from "./enums";
import { users } from "../identity/tables";
import { employees } from "../workforce/tables";
import { branches, locations } from "../org/tables";

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

/**
 * Period locks for timesheet management.
 * Controls editability of attendance data per monthly period.
 * State machine: OPEN → LOCKED → PAYROLL_PROCESSING → PAYROLL_POSTED
 */
export const attendancePeriodLocks = pgTable(
  "attendance_period_locks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    period: text("period").notNull().unique(), // "2026-08"
    status: attendancePeriodLockStatusEnum("status")
      .default(AttendancePeriodStatus.OPEN)
      .notNull(),

    lockedByUserId: uuid("locked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),

    unlockedByUserId: uuid("unlocked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),

    remarks: text("remarks"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_attendance_period_locks_period").on(table.period),
    idxStatus: index("idx_attendance_period_locks_status").on(table.status),
    chkPeriodFormat: check(
      "chk_attendance_period_locks_period_format",
      sql`${table.period} ~ '^\\d{4}-(?:0[1-9]|1[0-2])$'`,
    ),
  }),
);

/**
 * Audit trail for period lifecycle transitions.
 * Every status change creates one row — immutable history.
 */
export const attendancePeriodHistory = pgTable(
  "attendance_period_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    period: text("period").notNull(), // "2026-08"
    fromStatus: attendancePeriodLockStatusEnum("from_status").notNull(),
    toStatus: attendancePeriodLockStatusEnum("to_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_attendance_period_history_period").on(table.period),
    idxCreatedAt: index("idx_attendance_period_history_created_at").on(table.createdAt),
  }),
);

/**
 * Immutable snapshots of monthly timesheet data per employee.
 * Created when a period transitions to CLOSED.
 * Payroll consumes these snapshots instead of querying live attendance data.
 */
export const timesheetSnapshots = pgTable(
  "timesheet_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    period: text("period").notNull(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    snapshotVersion: integer("snapshot_version").default(1).notNull(),

    workingDays: integer("working_days").default(0).notNull(),
    workedMinutes: integer("worked_minutes").default(0).notNull(),
    lateMinutes: integer("late_minutes").default(0).notNull(),
    earlyLeaveMinutes: integer("early_leave_minutes").default(0).notNull(),
    overtimeMinutes: integer("overtime_minutes").default(0).notNull(),

    periodStatusAtSnapshot: attendancePeriodLockStatusEnum("period_status_at_snapshot").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_timesheet_snapshots_period").on(table.period),
    idxEmployee: index("idx_timesheet_snapshots_employee_id").on(table.employeeId),
    uqEmployeePeriodVersion: unique(
      "uq_timesheet_snapshots_employee_period_version",
    ).on(table.employeeId, table.period, table.snapshotVersion),
  }),
);

/**
 * Payroll reconciliation runs.
 * Each run compares attendance snapshot data against payroll results
 * for a given period. Read-only — never modifies attendance or payroll.
 */
export const attendancePayrollReconciliations = pgTable(
  "attendance_payroll_reconciliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    period: text("period").notNull(), // "2026-08"
    status: reconciliationStatusEnum("status")
      .default("pending")
      .notNull(),

    totalEmployees: integer("total_employees").default(0).notNull(),
    matchedCount: integer("matched_count").default(0).notNull(),
    mismatchCount: integer("mismatch_count").default(0).notNull(),

    checkedByUserId: uuid("checked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_reconciliation_period").on(table.period),
    idxStatus: index("idx_reconciliation_status").on(table.status),
  }),
);

/**
 * Employee-level reconciliation items.
 * Each row compares one employee's attendance snapshot vs payroll result.
 * The diff type explains any mismatch.
 */
export const attendancePayrollReconciliationItems = pgTable(
  "attendance_payroll_reconciliation_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reconciliationId: uuid("reconciliation_id")
      .notNull()
      .references(() => attendancePayrollReconciliations.id, {
        onDelete: "cascade",
      }),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    attendanceRegularHours: integer("attendance_regular_hours").default(0).notNull(),
    payrollRegularHours: integer("payroll_regular_hours").default(0).notNull(),

    attendanceOvertimeHours: integer("attendance_overtime_hours").default(0).notNull(),
    payrollOvertimeHours: integer("payroll_overtime_hours").default(0).notNull(),

    diffType: reconciliationDiffTypeEnum("diff_type").notNull(),

    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxReconciliation: index("idx_reconciliation_items_recon_id").on(table.reconciliationId),
    idxEmployee: index("idx_reconciliation_items_employee_id").on(table.employeeId),
  }),
);

/**
 * Post-closure attendance adjustments.
 * Corrections after period closure — never rewrites snapshot.
 * Creates a new adjustment fact consumed by payroll as delta.
 */
export const attendanceAdjustments = pgTable(
  "attendance_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    period: text("period").notNull(), // "2026-08"
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    status: attendanceAdjustmentStatusEnum("status")
      .default("draft")
      .notNull(),

    reason: text("reason").notNull(),

    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true }),

    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    rejectionReason: text("rejection_reason"),

    appliedAt: timestamp("applied_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_adjustments_period").on(table.period),
    idxEmployee: index("idx_adjustments_employee_id").on(table.employeeId),
    idxStatus: index("idx_adjustments_status").on(table.status),
  }),
);

/**
 * Individual field changes within an adjustment.
 * Each row represents one delta (e.g., +8 regular hours).
 */
export const attendanceAdjustmentItems = pgTable(
  "attendance_adjustment_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    adjustmentId: uuid("adjustment_id")
      .notNull()
      .references(() => attendanceAdjustments.id, { onDelete: "cascade" }),

    fieldName: attendanceAdjustmentFieldEnum("field_name").notNull(),
    oldValue: integer("old_value").default(0).notNull(),
    newValue: integer("new_value").default(0).notNull(),
    delta: integer("delta").default(0).notNull(),
  },
  (table) => ({
    idxAdjustment: index("idx_adjustment_items_adjustment_id").on(table.adjustmentId),
  }),
);
