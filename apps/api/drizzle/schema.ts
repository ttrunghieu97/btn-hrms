import { pgTable, index, foreignKey, check, uuid, time, text, jsonb, timestamp, unique, integer, boolean, bigserial, date, numeric, varchar, uniqueIndex, type AnyPgColumn, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const allowanceTypeEnum = pgEnum("allowance_type_enum", ['position', 'salary', 'seniority', 'professional_seniority', 'additional'])
export const applicationStageEnum = pgEnum("application_stage_enum", ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'])
export const approvalRequestStatusEnum = pgEnum("approval_request_status_enum", ['pending', 'approved', 'rejected', 'cancelled'])
export const approvalStepStatusEnum = pgEnum("approval_step_status_enum", ['pending', 'approved', 'rejected', 'skipped'])
export const assigneeTypeEnum = pgEnum("assignee_type_enum", ['employee', 'manager', 'hr', 'it', 'specific'])
export const attendanceEventSourceEnum = pgEnum("attendance_event_source_enum", ['DEVICE', 'MANUAL'])
export const attendanceEventTypeEnum = pgEnum("attendance_event_type_enum", ['CLOCK_IN', 'CLOCK_OUT'])
export const attendanceExceptionStatusEnum = pgEnum("attendance_exception_status_enum", ['pending', 'resolved', 'closed'])
export const attendanceExceptionTypeEnum = pgEnum("attendance_exception_type_enum", ['missing_punch', 'invalid_sequence', 'off_shift'])
export const attendanceOverrideReasonEnum = pgEnum("attendance_override_reason_enum", ['manual_correction', 'policy_exception', 'data_fix', 'reconciliation'])
export const attendanceSessionEnum = pgEnum("attendance_session_enum", ['morning', 'noon', 'afternoon'])
export const attendanceSessionStatusEnum = pgEnum("attendance_session_status_enum", ['READY', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED'])
export const attendanceSessionTypeEnum = pgEnum("attendance_session_type_enum", ['MORNING', 'AFTERNOON', 'LUNCH_DUTY', 'NIGHT', 'OT'])
export const attendanceSourceEnum = pgEnum("attendance_source_enum", ['mobile', 'web', 'api', 'manual'])
export const attendanceSummaryStatusEnum = pgEnum("attendance_summary_status_enum", ['present', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'off'])
export const attendanceTypeEnum = pgEnum("attendance_type_enum", ['check_in', 'check_out', 'break_start', 'break_end', 'note'])
export const availabilitySourceEnum = pgEnum("availability_source_enum", ['employee', 'manager'])
export const boardingProcessStatusEnum = pgEnum("boarding_process_status_enum", ['pending', 'in_progress', 'completed', 'cancelled'])
export const boardingTypeEnum = pgEnum("boarding_type_enum", ['onboarding', 'offboarding'])
export const chatConversationTypeEnum = pgEnum("chat_conversation_type_enum", ['direct', 'group'])
export const chatMessageStatusEnum = pgEnum("chat_message_status_enum", ['sent', 'delivered', 'read'])
export const chatMessageTypeEnum = pgEnum("chat_message_type_enum", ['text', 'attachment', 'system'])
export const chatParticipantRoleEnum = pgEnum("chat_participant_role_enum", ['owner', 'admin', 'member'])
export const checklistItemStatusEnum = pgEnum("checklist_item_status_enum", ['pending', 'in_progress', 'completed', 'skipped'])
export const clearanceDecisionEnum = pgEnum("clearance_decision_enum", ['pending', 'approved', 'rejected'])
export const clearanceDepartmentEnum = pgEnum("clearance_department_enum", ['it', 'hr', 'finance', 'manager', 'security'])
export const companyStatusEnum = pgEnum("company_status_enum", ['active', 'inactive'])
export const contractStatusEnum = pgEnum("contract_status_enum", ['draft', 'active', 'terminated', 'superseded'])
export const contractTypeEnum = pgEnum("contract_type_enum", ['permanent', 'fixed_term', 'probationary', 'internship', 'service', 'part_time'])
export const educationLevelEnum = pgEnum("education_level_enum", ['primary', 'lower_secondary', 'upper_secondary', 'vocational', 'college', 'bachelor', 'master', 'doctor', 'other'])
export const employeeStatusEnum = pgEnum("employee_status_enum", ['working', 'probation', 'terminated', 'leave', 'suspended', 'retired'])
export const employmentTypeEnum = pgEnum("employment_type_enum", ['permanent', 'fixed_term', 'probationary', 'internship', 'contractor', 'part_time'])
export const fileStatusEnum = pgEnum("file_status_enum", ['temp', 'active', 'archived', 'replaced', 'orphan', 'finalize_failed', 'pending_upload'])
export const genderEnum = pgEnum("gender_enum", ['male', 'female', 'other', 'unknown'])
export const jobCategoryEnum = pgEnum("job_category_enum", ['manager', 'high_level_technical', 'mid_level_technical', 'other'])
export const leaveRequestStatusEnum = pgEnum("leave_request_status_enum", ['draft', 'pending', 'approved', 'rejected', 'cancelled'])
export const leaveSessionEnum = pgEnum("leave_session_enum", ['full_day', 'morning', 'afternoon'])
export const leaveUnitEnum = pgEnum("leave_unit_enum", ['day', 'hour'])
export const locationTypeEnum = pgEnum("location_type_enum", ['region', 'country', 'city', 'district', 'site', 'office'])
export const lunchDutyTypeEnum = pgEnum("lunch_duty_type_enum", ['indoor', 'outdoor'])
export const notificationStatusEnum = pgEnum("notification_status_enum", ['pending', 'sent', 'failed'])
export const notificationTypeEnum = pgEnum("notification_type_enum", ['email', 'sms', 'push', 'in_app'])
export const offerStatusEnum = pgEnum("offer_status_enum", ['draft', 'pending_approval', 'approved', 'rejected', 'accepted', 'declined'])
export const orgAssignmentTypeEnum = pgEnum("org_assignment_type_enum", ['primary', 'secondary', 'temporary'])
export const overtimeStatusEnum = pgEnum("overtime_status_enum", ['pending', 'approved', 'rejected', 'cancelled'])
export const payFrequencyEnum = pgEnum("pay_frequency_enum", ['monthly', 'semi_monthly', 'bi_weekly', 'weekly'])
export const payrollItemTypeEnum = pgEnum("payroll_item_type_enum", ['earning', 'deduction', 'tax', 'insurance', 'employer_contribution', 'overtime', 'adjustment'])
export const payrollPeriodStatusEnum = pgEnum("payroll_period_status_enum", ['draft', 'open', 'processing', 'closed', 'paid'])
export const payrollRunStatusEnum = pgEnum("payroll_run_status_enum", ['draft', 'processing', 'pending_approval', 'approved', 'posted', 'cancelled'])
export const payslipStatusEnum = pgEnum("payslip_status_enum", ['draft', 'published', 'acknowledged', 'voided'])
export const positionStatusEnum = pgEnum("position_status_enum", ['draft', 'pending_approval', 'open', 'frozen', 'closed'])
export const postingStatusEnum = pgEnum("posting_status_enum", ['open', 'paused', 'closed'])
export const punchVerificationStatusEnum = pgEnum("punch_verification_status_enum", ['verified', 'flagged', 'rejected'])
export const recruitmentApprovalSubjectEnum = pgEnum("recruitment_approval_subject_enum", ['requisition', 'offer'])
export const requestIdempotencyStatusEnum = pgEnum("request_idempotency_status_enum", ['pending', 'completed', 'failed'])
export const requisitionStatusEnum = pgEnum("requisition_status_enum", ['draft', 'pending_approval', 'approved', 'rejected', 'closed'])
export const scheduleRequestStatusEnum = pgEnum("schedule_request_status_enum", ['PENDING', 'APPROVED', 'DENIED'])
export const scheduleRequestTypeEnum = pgEnum("schedule_request_type_enum", ['MORNING_OFF', 'AFTERNOON_OFF', 'FULL_DAY_OFF'])
export const settlementStatusEnum = pgEnum("settlement_status_enum", ['pending', 'processing', 'settled', 'failed'])
export const shiftAssignmentStatusEnum = pgEnum("shift_assignment_status_enum", ['planned', 'published', 'completed', 'cancelled'])
export const socialInsuranceStatusEnum = pgEnum("social_insurance_status_enum", ['pending', 'active', 'paused', 'terminated'])
export const statutoryContributionTypeEnum = pgEnum("statutory_contribution_type_enum", ['social_insurance', 'health_insurance', 'unemployment_insurance'])
export const taskActivityActionEnum = pgEnum("task_activity_action_enum", ['created', 'assigned', 'accepted', 'declined', 'submitted', 'approved', 'returned', 'resubmitted', 'cancelled', 'status_changed', 'progress_updated', 'unassigned'])
export const taskDependencyTypeEnum = pgEnum("task_dependency_type_enum", ['blocks', 'related'])
export const taskDomainEventTypeEnum = pgEnum("task_domain_event_type_enum", ['task.created', 'task.assigned', 'task.unassigned', 'task.accepted', 'task.declined', 'task.started', 'task.submitted', 'task.revision_requested', 'task.completed', 'task.cancelled', 'task.deleted', 'task.comment_added', 'task.attachment_uploaded', 'task.overdue', 'task.due_soon', 'task.approval_overdue', 'task.revision_limit_reached', 'task.bulk_assigned', 'task.reassigned'])
export const taskPriorityEnum = pgEnum("task_priority_enum", ['low', 'medium', 'high', 'urgent'])
export const taskStatusEnum = pgEnum("task_status_enum", ['created', 'assigned', 'in_progress', 'declined', 'submitted', 'revision', 'completed', 'cancelled'])
export const violationSeverityEnum = pgEnum("violation_severity_enum", ['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
export const violationStatusEnum = pgEnum("violation_status_enum", ['OPEN', 'RESOLVED', 'WAIVED'])
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status_enum", ['pending', 'processing', 'delivered', 'failed'])
export const webhookSubscriptionStatusEnum = pgEnum("webhook_subscription_status_enum", ['active', 'disabled'])
export const weekdayEnum = pgEnum("weekday_enum", ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
export const workflowInstanceStatusEnum = pgEnum("workflow_instance_status_enum", ['active', 'completed', 'cancelled', 'failed'])


export const workBlocks = pgTable("work_blocks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scheduleId: uuid("schedule_id").notNull(),
	dayOfWeek: weekdayEnum("day_of_week").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	note: text(),
}, (table) => [
	index("idx_work_blocks_schedule_id").using("btree", table.scheduleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [schedules.id],
			name: "work_blocks_schedule_id_schedules_id_fk"
		}).onDelete("cascade"),
	check("chk_work_blocks_time_range", sql`start_time < end_time`),
]);

export const taskActivities = pgTable("task_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	actorUserId: uuid("actor_user_id"),
	action: taskActivityActionEnum().notNull(),
	fromStatus: taskStatusEnum("from_status"),
	toStatus: taskStatusEnum("to_status"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_activities_actor").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_activities_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_activities_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "task_activities_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const shiftTemplates = pgTable("shift_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	locationId: uuid("location_id"),
	holidayCalendarId: uuid("holiday_calendar_id"),
	code: text().notNull(),
	name: text().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	breakMinutes: integer("break_minutes").default(0).notNull(),
	toleranceMinutes: integer("tolerance_minutes").default(0).notNull(),
	workDays: jsonb("work_days"),
	isNightShift: boolean("is_night_shift").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shift_templates_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	index("idx_shift_templates_location_id").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "shift_templates_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "shift_templates_location_id_locations_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.holidayCalendarId],
			foreignColumns: [holidayCalendars.id],
			name: "shift_templates_holiday_calendar_id_holiday_calendars_id_fk"
		}).onDelete("set null"),
	unique("uq_shift_templates_company_code").on(table.code),
]);

export const taskAssignments = pgTable("task_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	employeeId: uuid("employee_id"),
	assignedByUserId: uuid("assigned_by_user_id"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_assignments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_assignments_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_assignments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "task_assignments_employee_id_employees_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.assignedByUserId],
			foreignColumns: [users.id],
			name: "task_assignments_assigned_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const taskComments = pgTable("task_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	authorUserId: uuid("author_user_id"),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_comments_author_user_id").using("btree", table.authorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_comments_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_comments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [users.id],
			name: "task_comments_author_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const taskDelegations = pgTable("task_delegations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	delegatorUserId: uuid("delegator_user_id").notNull(),
	delegateeUserId: uuid("delegatee_user_id").notNull(),
	departmentId: uuid("department_id"),
	isActive: boolean("is_active").default(true).notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_delegations_delegatee").using("btree", table.delegateeUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_delegations_delegator").using("btree", table.delegatorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_delegations_department").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_delegations_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.delegatorUserId],
			foreignColumns: [users.id],
			name: "task_delegations_delegator_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.delegateeUserId],
			foreignColumns: [users.id],
			name: "task_delegations_delegatee_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "task_delegations_department_id_departments_id_fk"
		}).onDelete("set null"),
]);

export const workRoles = pgTable("work_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_work_roles_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("work_roles_name_unique").on(table.name),
]);

export const taskAttachments = pgTable("task_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	uploadedByUserId: uuid("uploaded_by_user_id"),
	fileName: text("file_name").notNull(),
	url: text().notNull(),
	mimeType: text("mime_type"),
	size: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_attachments_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_attachments_uploaded_by").using("btree", table.uploadedByUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_attachments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedByUserId],
			foreignColumns: [users.id],
			name: "task_attachments_uploaded_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const taskDependencies = pgTable("task_dependencies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	dependsOnTaskId: uuid("depends_on_task_id").notNull(),
	type: taskDependencyTypeEnum().default('blocks').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_deps_depends_on").using("btree", table.dependsOnTaskId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_deps_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_dependencies_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.dependsOnTaskId],
			foreignColumns: [tasks.id],
			name: "task_dependencies_depends_on_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	unique("uq_task_deps").on(table.taskId, table.dependsOnTaskId),
]);

export const taskEvents = pgTable("task_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	globalSequence: bigserial("global_sequence", { mode: "bigint" }).notNull(),
	aggregateId: uuid("aggregate_id").notNull(),
	eventType: taskDomainEventTypeEnum("event_type").notNull(),
	actorUserId: uuid("actor_user_id"),
	payload: jsonb().default({}).notNull(),
	correlationId: uuid("correlation_id"),
	causationId: uuid("causation_id"),
	sequence: integer().default(0).notNull(),
	processed: boolean().default(false).notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_events_actor_user_id").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_events_aggregate_id").using("btree", table.aggregateId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_events_event_type").using("btree", table.eventType.asc().nullsLast().op("enum_ops")),
	index("idx_task_events_global_sequence").using("btree", table.globalSequence.asc().nullsLast().op("int8_ops")),
	index("idx_task_events_occurred_at").using("btree", table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.aggregateId],
			foreignColumns: [tasks.id],
			name: "task_events_aggregate_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "task_events_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const attendanceExceptions = pgTable("attendance_exceptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	attendanceDailySummaryId: uuid("attendance_daily_summary_id"),
	workDate: date("work_date").notNull(),
	type: attendanceExceptionTypeEnum().notNull(),
	status: attendanceExceptionStatusEnum().default('pending').notNull(),
	relatedEventIds: jsonb("related_event_ids"),
	resolutionNote: text("resolution_note"),
	resolvedByUserId: uuid("resolved_by_user_id"),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_exceptions_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_exceptions_resolved_by").using("btree", table.resolvedByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_exceptions_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_attendance_exceptions_summary_id").using("btree", table.attendanceDailySummaryId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_exceptions_work_date").using("btree", table.workDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.attendanceDailySummaryId],
			foreignColumns: [attendanceDailySummaries.id],
			name: "attendance_exceptions_attendance_daily_summary_id_attendance_da"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_exceptions_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resolvedByUserId],
			foreignColumns: [users.id],
			name: "attendance_exceptions_resolved_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_attendance_exceptions_employee_date_type").on(table.employeeId, table.workDate, table.type),
]);

export const taskNotifications = pgTable("task_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	taskId: uuid("task_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	body: text(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_notifications_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("idx_task_notifications_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_notifications_task_id_tasks_id_fk"
		}).onDelete("cascade"),
]);

export const taskRecurrences = pgTable("task_recurrences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	cronExpression: text("cron_expression").notNull(),
	nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastCreatedTaskId: uuid("last_created_task_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_recurrences_active_next_run").using("btree", table.isActive.asc().nullsLast().op("timestamptz_ops"), table.nextRunAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_task_recurrences_last_task_id").using("btree", table.lastCreatedTaskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [taskTemplates.id],
			name: "task_recurrences_template_id_task_templates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.lastCreatedTaskId],
			foreignColumns: [tasks.id],
			name: "task_recurrences_last_created_task_id_tasks_id_fk"
		}).onDelete("set null"),
]);

export const employeeEducations = pgTable("employee_educations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	educationLevel: educationLevelEnum("education_level").notNull(),
	educationName: text("education_name"),
	major: text(),
	institution: text(),
	graduationYear: integer("graduation_year"),
	gpa: numeric({ precision: 4, scale:  2 }),
	documentId: uuid("document_id"),
	verified: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_employee_educations_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_educations_institution").using("btree", table.institution.asc().nullsLast().op("text_ops")),
	index("idx_employee_educations_level").using("btree", table.educationLevel.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_educations_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [files.id],
			name: "employee_educations_document_id_files_id_fk"
		}).onDelete("set null"),
]);

export const userIdentities = pgTable("user_identities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	providerSub: text("provider_sub").notNull(),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_identities_provider").using("btree", table.providerSub.asc().nullsLast().op("text_ops")),
	index("idx_user_identities_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_identities_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("uq_user_identities_provider_user").on(table.userId, table.provider),
]);

export const candidates = pgTable("candidates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 320 }).notNull(),
	fullName: varchar("full_name", { length: 200 }).notNull(),
	phone: varchar({ length: 40 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_candidates_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("candidates_email_unique").on(table.email),
]);

export const interviewScorecards = pgTable("interview_scorecards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id").notNull(),
	interviewerUserId: uuid("interviewer_user_id").notNull(),
	rating: integer().notNull(),
	feedback: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_interview_scorecards_application_id").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "interview_scorecards_application_id_applications_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.interviewerUserId],
			foreignColumns: [users.id],
			name: "interview_scorecards_interviewer_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("uq_interview_scorecards_application_interviewer").on(table.applicationId, table.interviewerUserId),
	check("chk_interview_scorecards_rating", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const jobRequisitions = pgTable("job_requisitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	departmentId: uuid("department_id").notNull(),
	positionId: uuid("position_id"),
	title: varchar({ length: 200 }).notNull(),
	headcount: integer().default(1).notNull(),
	budgetMin: numeric("budget_min", { precision: 14, scale:  2 }),
	budgetMax: numeric("budget_max", { precision: 14, scale:  2 }),
	justification: text(),
	status: requisitionStatusEnum().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_job_requisitions_department_id").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_job_requisitions_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "job_requisitions_department_id_departments_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "job_requisitions_position_id_positions_id_fk"
		}).onDelete("set null"),
	check("chk_job_requisitions_headcount", sql`headcount >= 1`),
	check("chk_job_requisitions_budget_range", sql`(budget_min IS NULL) OR (budget_max IS NULL) OR (budget_min <= budget_max)`),
]);

export const offers = pgTable("offers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id").notNull(),
	compensation: numeric({ precision: 14, scale:  2 }).notNull(),
	startDate: date("start_date").notNull(),
	expiresAt: date("expires_at"),
	status: offerStatusEnum().default('draft').notNull(),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_offers_application_id").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	index("idx_offers_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "offers_application_id_applications_id_fk"
		}).onDelete("cascade"),
]);

export const recruitmentApprovalLinks = pgTable("recruitment_approval_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subjectType: recruitmentApprovalSubjectEnum("subject_type").notNull(),
	subjectId: uuid("subject_id").notNull(),
	approvalRequestId: uuid("approval_request_id").notNull(),
	policyId: uuid("policy_id"),
	status: approvalRequestStatusEnum().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_recruitment_approval_links_approval_request_id").using("btree", table.approvalRequestId.asc().nullsLast().op("uuid_ops")),
	index("idx_recruitment_approval_links_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.approvalRequestId],
			foreignColumns: [approvalRequests.id],
			name: "recruitment_approval_links_approval_request_id_approval_request"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [approvalPolicies.id],
			name: "recruitment_approval_links_policy_id_approval_policies_id_fk"
		}).onDelete("set null"),
	unique("uq_recruitment_approval_links_subject").on(table.subjectType, table.subjectId),
	unique("recruitment_approval_links_approval_request_id_unique").on(table.approvalRequestId),
]);

export const applications = pgTable("applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	candidateId: uuid("candidate_id").notNull(),
	postingId: uuid("posting_id").notNull(),
	currentStage: applicationStageEnum("current_stage").default('applied').notNull(),
	cvFileId: uuid("cv_file_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_applications_candidate_id").using("btree", table.candidateId.asc().nullsLast().op("uuid_ops")),
	index("idx_applications_current_stage").using("btree", table.currentStage.asc().nullsLast().op("enum_ops")),
	index("idx_applications_posting_id").using("btree", table.postingId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "applications_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postingId],
			foreignColumns: [jobPostings.id],
			name: "applications_posting_id_job_postings_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cvFileId],
			foreignColumns: [files.id],
			name: "applications_cv_file_id_files_id_fk"
		}).onDelete("set null"),
	unique("uq_applications_candidate_posting").on(table.candidateId, table.postingId),
]);

export const applicationStageEvents = pgTable("application_stage_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id").notNull(),
	fromStage: applicationStageEnum("from_stage"),
	toStage: applicationStageEnum("to_stage").notNull(),
	actorUserId: uuid("actor_user_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_application_stage_events_application_id").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "application_stage_events_application_id_applications_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "application_stage_events_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const jobPostings = pgTable("job_postings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requisitionId: uuid("requisition_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	requirements: text(),
	status: postingStatusEnum().default('open').notNull(),
	openedAt: date("opened_at"),
	closesAt: date("closes_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
}, (table) => [
	index("idx_job_postings_requisition_id").using("btree", table.requisitionId.asc().nullsLast().op("uuid_ops")),
	index("idx_job_postings_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.requisitionId],
			foreignColumns: [jobRequisitions.id],
			name: "job_postings_requisition_id_job_requisitions_id_fk"
		}).onDelete("cascade"),
]);

export const boardingTemplates = pgTable("boarding_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: boardingTypeEnum().notNull(),
	departmentId: uuid("department_id"),
	positionId: uuid("position_id"),
	isDefault: boolean("is_default").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_boarding_templates_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "boarding_templates_department_id_fkey"
		}),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "boarding_templates_position_id_fkey"
		}),
]);

export const boardingTemplateItems = pgTable("boarding_template_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 255 }),
	assigneeType: assigneeTypeEnum("assignee_type").notNull(),
	defaultAssigneeUserId: uuid("default_assignee_user_id"),
	dueDaysOffset: integer("due_days_offset").default(0).notNull(),
	isMandatory: boolean("is_mandatory").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_boarding_template_items_template").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [boardingTemplates.id],
			name: "boarding_template_items_template_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.defaultAssigneeUserId],
			foreignColumns: [users.id],
			name: "boarding_template_items_default_assignee_user_id_fkey"
		}),
]);

export const boardingProcesses = pgTable("boarding_processes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	templateId: uuid("template_id"),
	type: boardingTypeEnum().notNull(),
	status: boardingProcessStatusEnum().default('pending').notNull(),
	startDate: date("start_date").notNull(),
	targetEndDate: date("target_end_date"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	assignedHrUserId: uuid("assigned_hr_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_boarding_processes_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_boarding_processes_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_boarding_processes_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "boarding_processes_employee_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [boardingTemplates.id],
			name: "boarding_processes_template_id_fkey"
		}),
	foreignKey({
			columns: [table.assignedHrUserId],
			foreignColumns: [users.id],
			name: "boarding_processes_assigned_hr_user_id_fkey"
		}),
]);

export const boardingChecklistItems = pgTable("boarding_checklist_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	processId: uuid("process_id").notNull(),
	templateItemId: uuid("template_item_id"),
	title: varchar({ length: 255 }).notNull(),
	assigneeUserId: uuid("assignee_user_id"),
	status: checklistItemStatusEnum().default('pending').notNull(),
	dueDate: date("due_date"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	completedByUserId: uuid("completed_by_user_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_boarding_checklist_items_process").using("btree", table.processId.asc().nullsLast().op("uuid_ops")),
	index("idx_boarding_checklist_items_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [boardingProcesses.id],
			name: "boarding_checklist_items_process_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateItemId],
			foreignColumns: [boardingTemplateItems.id],
			name: "boarding_checklist_items_template_item_id_fkey"
		}),
	foreignKey({
			columns: [table.assigneeUserId],
			foreignColumns: [users.id],
			name: "boarding_checklist_items_assignee_user_id_fkey"
		}),
	foreignKey({
			columns: [table.completedByUserId],
			foreignColumns: [users.id],
			name: "boarding_checklist_items_completed_by_user_id_fkey"
		}),
]);

export const exitInterviews = pgTable("exit_interviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	processId: uuid("process_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	interviewerUserId: uuid("interviewer_user_id"),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	conductedAt: timestamp("conducted_at", { withTimezone: true, mode: 'string' }),
	responses: jsonb(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_exit_interviews_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_exit_interviews_process").using("btree", table.processId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [boardingProcesses.id],
			name: "exit_interviews_process_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "exit_interviews_employee_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.interviewerUserId],
			foreignColumns: [users.id],
			name: "exit_interviews_interviewer_user_id_fkey"
		}),
]);

export const allowances = pgTable("allowances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	type: allowanceTypeEnum().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_allowances_effective").using("btree", table.effectiveFrom.asc().nullsLast().op("date_ops"), table.effectiveTo.asc().nullsLast().op("date_ops")),
	index("idx_allowances_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_allowances_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "allowances_employee_id_fkey"
		}).onDelete("cascade"),
]);

export const socialInsuranceEnrollments = pgTable("social_insurance_enrollments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	insuranceNumber: text("insurance_number").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	status: socialInsuranceStatusEnum().default('active').notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_social_insurance_enrollments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_social_insurance_enrollments_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "social_insurance_enrollments_employee_id_fkey"
		}).onDelete("cascade"),
]);

export const offboardingClearances = pgTable("offboarding_clearances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	processId: uuid("process_id").notNull(),
	department: clearanceDepartmentEnum().notNull(),
	decision: clearanceDecisionEnum().default('pending').notNull(),
	decidedByUserId: uuid("decided_by_user_id"),
	note: text(),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_offboarding_clearances_department").using("btree", table.department.asc().nullsLast().op("enum_ops")),
	index("idx_offboarding_clearances_process").using("btree", table.processId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uniq_offboarding_clearances_process_department").using("btree", table.processId.asc().nullsLast().op("uuid_ops"), table.department.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [boardingProcesses.id],
			name: "offboarding_clearances_process_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.decidedByUserId],
			foreignColumns: [users.id],
			name: "offboarding_clearances_decided_by_user_id_fkey"
		}),
]);

export const offboardingSettlementLinks = pgTable("offboarding_settlement_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	processId: uuid("process_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	status: settlementStatusEnum().default('pending').notNull(),
	payrollRef: varchar("payroll_ref", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_offboarding_settlement_links_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_offboarding_settlement_links_process").using("btree", table.processId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uniq_offboarding_settlement_links_process").using("btree", table.processId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [boardingProcesses.id],
			name: "offboarding_settlement_links_process_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "offboarding_settlement_links_employee_id_fkey"
		}).onDelete("cascade"),
]);

export const payrollRuns = pgTable("payroll_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payrollPeriodId: uuid("payroll_period_id").notNull(),
	branchId: uuid("branch_id"),
	status: payrollRunStatusEnum().default('draft').notNull(),
	approvedByUserId: uuid("approved_by_user_id"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payroll_runs_approved_by_user_id").using("btree", table.approvedByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_runs_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_runs_payroll_period_id").using("btree", table.payrollPeriodId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_runs_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.payrollPeriodId],
			foreignColumns: [payrollPeriods.id],
			name: "payroll_runs_payroll_period_id_payroll_periods_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "payroll_runs_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "payroll_runs_approved_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_payroll_runs_period_branch").on(table.payrollPeriodId, table.branchId),
]);

export const taskSlaRules = pgTable("task_sla_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	priority: taskPriorityEnum().notNull(),
	maxDurationMinutes: integer("max_duration_minutes").notNull(),
	notifyBeforeMinutes: integer("notify_before_minutes"),
	approvalLatencyMinutes: integer("approval_latency_minutes"),
	maxRevisionCount: integer("max_revision_count"),
	escalateToUserId: uuid("escalate_to_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_sla_rules_escalate_to").using("btree", table.escalateToUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.escalateToUserId],
			foreignColumns: [users.id],
			name: "task_sla_rules_escalate_to_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("task_sla_rules_priority_unique").on(table.priority),
]);

export const taskTemplates = pgTable("task_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	checklist: jsonb(),
	priority: taskPriorityEnum().default('medium').notNull(),
	defaultAssigneeId: uuid("default_assignee_id"),
	departmentId: uuid("department_id"),
	isActive: boolean("is_active").default(true).notNull(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_templates_default_assignee_id").using("btree", table.defaultAssigneeId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_templates_department_id").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.defaultAssigneeId],
			foreignColumns: [employees.id],
			name: "task_templates_default_assignee_id_employees_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "task_templates_department_id_departments_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "task_templates_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const payslips = pgTable("payslips", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payrollRunId: uuid("payroll_run_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	grossPay: numeric("gross_pay", { precision: 14, scale:  2 }).default('0').notNull(),
	totalDeductions: numeric("total_deductions", { precision: 14, scale:  2 }).default('0').notNull(),
	netPay: numeric("net_pay", { precision: 14, scale:  2 }).default('0').notNull(),
	currency: text().default('VND').notNull(),
	status: payslipStatusEnum().default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payslips_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_payslips_payroll_run_id").using("btree", table.payrollRunId.asc().nullsLast().op("uuid_ops")),
	index("idx_payslips_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRuns.id],
			name: "payslips_payroll_run_id_payroll_runs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "payslips_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	unique("uq_payslips_payroll_run_employee").on(table.payrollRunId, table.employeeId),
]);

export const payrolls = pgTable("payrolls", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	salary: numeric({ precision: 14, scale:  2 }).notNull(),
	bonus: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	deduction: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	allowance: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	overtimeAmount: numeric("overtime_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	insuranceAmount: numeric("insurance_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	netSalary: numeric("net_salary", { precision: 14, scale:  2 }),
	currency: text().default('VND').notNull(),
	effectiveFrom: date("effective_from"),
	effectiveTo: date("effective_to"),
	payrollPeriodId: uuid("payroll_period_id"),
	payrollRunId: uuid("payroll_run_id"),
	payslipId: uuid("payslip_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payrolls_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_payrolls_payroll_period_id").using("btree", table.payrollPeriodId.asc().nullsLast().op("uuid_ops")),
	index("idx_payrolls_payroll_run_id").using("btree", table.payrollRunId.asc().nullsLast().op("uuid_ops")),
	index("idx_payrolls_payslip_id").using("btree", table.payslipId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "payrolls_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payrollPeriodId],
			foreignColumns: [payrollPeriods.id],
			name: "payrolls_payroll_period_id_payroll_periods_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRuns.id],
			name: "payrolls_payroll_run_id_payroll_runs_id_fk"
		}).onDelete("set null"),
	check("chk_payrolls_date_range", sql`(effective_to IS NULL) OR (effective_from IS NULL) OR (effective_from <= effective_to)`),
]);

export const payrollPeriods = pgTable("payroll_periods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	startsOn: date("starts_on").notNull(),
	endsOn: date("ends_on").notNull(),
	payDate: date("pay_date"),
	status: payrollPeriodStatusEnum().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payroll_periods_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	unique("uq_payroll_periods_company_code").on(table.code),
	check("chk_payroll_periods_date_range", sql`starts_on <= ends_on`),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatusEnum().default('created').notNull(),
	progress: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	resultText: text("result_text"),
	checklist: text(),
	assigneeId: uuid("assignee_id"),
	createdByUserId: uuid("created_by_user_id"),
	templateId: uuid("template_id"),
	parentTaskId: uuid("parent_task_id"),
	priority: taskPriorityEnum().default('medium').notNull(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	revisionReason: text("revision_reason"),
	cancellationReason: text("cancellation_reason"),
	revisionCount: integer("revision_count").default(0).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	lastReminderAt: timestamp("last_reminder_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tasks_assignee_id").using("btree", table.assigneeId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_company_status").using("btree", table.status.asc().nullsLast().op("enum_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_tasks_created_by_user_id").using("btree", table.createdByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_tasks_parent_task_id").using("btree", table.parentTaskId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_priority").using("btree", table.priority.asc().nullsLast().op("enum_ops")),
	index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_tasks_template_id").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [employees.id],
			name: "tasks_assignee_id_employees_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "tasks_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [taskTemplates.id],
			name: "tasks_template_id_task_templates_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentTaskId],
			foreignColumns: [table.id],
			name: "tasks_parent_task_id_tasks_id_fk"
		}).onDelete("set null"),
]);

export const taskSubmissions = pgTable("task_submissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	submittedByUserId: uuid("submitted_by_user_id"),
	version: integer().notNull(),
	resultText: text("result_text"),
	checklist: jsonb(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_submissions_submitted_by").using("btree", table.submittedByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_submissions_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_submissions_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.submittedByUserId],
			foreignColumns: [users.id],
			name: "task_submissions_submitted_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_task_submissions_task_version").on(table.taskId, table.version),
]);

export const payrollItems = pgTable("payroll_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payrollRunId: uuid("payroll_run_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	payslipId: uuid("payslip_id"),
	type: payrollItemTypeEnum().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	quantity: numeric({ precision: 10, scale:  2 }),
	rate: numeric({ precision: 10, scale:  2 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payroll_items_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_items_payroll_run_id").using("btree", table.payrollRunId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_items_payslip_id").using("btree", table.payslipId.asc().nullsLast().op("uuid_ops")),
	index("idx_payroll_items_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRuns.id],
			name: "payroll_items_payroll_run_id_payroll_runs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "payroll_items_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.payslipId],
			foreignColumns: [payslips.id],
			name: "payroll_items_payslip_id_payslips_id_fk"
		}).onDelete("set null"),
]);

export const payrollCostSummaries = pgTable("payroll_cost_summaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payrollPeriodId: uuid("payroll_period_id").notNull(),
	branchId: uuid("branch_id"),
	departmentId: uuid("department_id"),
	employmentType: employmentTypeEnum("employment_type"),
	totalGross: numeric("total_gross", { precision: 14, scale:  2 }).notNull(),
	totalNet: numeric("total_net", { precision: 14, scale:  2 }).notNull(),
	totalEmployerContributions: numeric("total_employer_contributions", { precision: 14, scale:  2 }).default('0').notNull(),
	employeeCount: integer("employee_count").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payroll_cost_period").using("btree", table.payrollPeriodId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.payrollPeriodId],
			foreignColumns: [payrollPeriods.id],
			name: "payroll_cost_summaries_payroll_period_id_payroll_periods_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "payroll_cost_summaries_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "payroll_cost_summaries_department_id_departments_id_fk"
		}).onDelete("set null"),
	check("chk_payroll_cost_summaries_employee_count", sql`employee_count >= 0`),
	check("chk_payroll_cost_summaries_total_gross_non_negative", sql`total_gross >= (0)::numeric`),
	check("chk_payroll_cost_summaries_total_net_non_negative", sql`total_net >= (0)::numeric`),
	check("chk_payroll_cost_summaries_employer_contrib_non_negative", sql`total_employer_contributions >= (0)::numeric`),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	emailEnabled: boolean("email_enabled").default(true).notNull(),
	smsEnabled: boolean("sms_enabled").default(false).notNull(),
	pushEnabled: boolean("push_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("notification_preferences_user_id_unique").on(table.userId),
]);

export const workflowInstances = pgTable("workflow_instances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	definitionId: uuid("definition_id").notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: text("subject_id").notNull(),
	currentState: text("current_state").notNull(),
	status: workflowInstanceStatusEnum().default('active').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_workflow_instances_definition_id").using("btree", table.definitionId.asc().nullsLast().op("uuid_ops")),
	index("idx_workflow_instances_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_workflow_instances_subject").using("btree", table.subjectType.asc().nullsLast().op("text_ops"), table.subjectId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.definitionId],
			foreignColumns: [workflowDefinitions.id],
			name: "workflow_instances_definition_id_workflow_definitions_id_fk"
		}).onDelete("cascade"),
]);

export const statutoryContributionRules = pgTable("statutory_contribution_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contributionType: statutoryContributionTypeEnum("contribution_type").notNull(),
	employmentType: employmentTypeEnum("employment_type"),
	employeeRate: numeric("employee_rate", { precision: 5, scale:  4 }).notNull(),
	employerRate: numeric("employer_rate", { precision: 5, scale:  4 }).notNull(),
	salaryCap: numeric("salary_cap", { precision: 14, scale:  2 }),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_statutory_rules_effective_date").using("btree", table.effectiveFrom.asc().nullsLast().op("date_ops"), table.effectiveTo.asc().nullsLast().op("date_ops")),
	check("chk_statutory_rules_employee_rate", sql`(employee_rate >= (0)::numeric) AND (employee_rate <= (1)::numeric)`),
	check("chk_statutory_rules_employer_rate", sql`(employer_rate >= (0)::numeric) AND (employer_rate <= (1)::numeric)`),
	check("chk_statutory_rules_salary_cap", sql`(salary_cap IS NULL) OR (salary_cap >= (0)::numeric)`),
	check("chk_statutory_rules_effective_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const taxBrackets = pgTable("tax_brackets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	bracketOrder: integer("bracket_order").notNull(),
	minIncome: numeric("min_income", { precision: 14, scale:  2 }).notNull(),
	maxIncome: numeric("max_income", { precision: 14, scale:  2 }),
	rate: numeric({ precision: 5, scale:  4 }).notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tax_brackets_effective_date").using("btree", table.effectiveFrom.asc().nullsLast().op("date_ops"), table.effectiveTo.asc().nullsLast().op("date_ops")),
	unique("uq_tax_brackets_company_order_from").on(table.bracketOrder, table.effectiveFrom),
	check("chk_tax_brackets_rate", sql`(rate >= (0)::numeric) AND (rate <= (1)::numeric)`),
	check("chk_tax_brackets_min_income", sql`min_income >= (0)::numeric`),
	check("chk_tax_brackets_income_range", sql`(max_income IS NULL) OR (max_income >= min_income)`),
	check("chk_tax_brackets_effective_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const headcountSnapshots = pgTable("headcount_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	snapshotDate: date("snapshot_date").notNull(),
	branchId: uuid("branch_id"),
	departmentId: uuid("department_id"),
	employmentStatus: employeeStatusEnum("employment_status").notNull(),
	employmentType: employmentTypeEnum("employment_type").notNull(),
	headcount: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_headcount_snapshots_date").using("btree", table.snapshotDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "headcount_snapshots_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "headcount_snapshots_department_id_departments_id_fk"
		}).onDelete("set null"),
	check("chk_headcount_snapshots_headcount", sql`headcount >= 0`),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	type: notificationTypeEnum().notNull(),
	subject: text(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("notification_templates_name_unique").on(table.name),
]);

export const workflowDefinitions = pgTable("workflow_definitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	version: integer().default(1).notNull(),
	name: text(),
	initialState: text("initial_state").notNull(),
	states: jsonb().notNull(),
	transitions: jsonb().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_workflow_definitions_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_workflow_definitions_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("uq_workflow_definitions_key_version").on(table.key, table.version),
]);

export const salaryStructures = pgTable("salary_structures", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	currency: text().default('VND').notNull(),
	payFrequency: payFrequencyEnum("pay_frequency").default('monthly').notNull(),
	baseSalary: numeric("base_salary", { precision: 14, scale:  2 }).notNull(),
	components: jsonb(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	isCurrent: boolean("is_current").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_salary_structures_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_salary_structures_is_current").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_salary_structures_current_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`(is_current = true)`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "salary_structures_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	check("chk_salary_structures_date_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const attendanceMonthlyAggregates = pgTable("attendance_monthly_aggregates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
	totalScheduledMinutes: integer("total_scheduled_minutes").default(0).notNull(),
	totalLateCount: integer("total_late_count").default(0).notNull(),
	totalAbsentDays: integer("total_absent_days").default(0).notNull(),
	totalLeaveDays: numeric("total_leave_days", { precision: 8, scale:  2 }).default('0').notNull(),
	totalOvertimeMinutes: integer("total_overtime_minutes").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_agg_year_month").using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_monthly_aggregates_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	unique("uq_attendance_monthly_aggregates_employee_month").on(table.employeeId, table.year, table.month),
	check("chk_attendance_monthly_aggregates_month", sql`(month >= 1) AND (month <= 12)`),
	check("chk_attendance_monthly_aggregates_worked_non_negative", sql`total_worked_minutes >= 0`),
	check("chk_attendance_monthly_aggregates_scheduled_non_negative", sql`total_scheduled_minutes >= 0`),
	check("chk_attendance_monthly_aggregates_late_non_negative", sql`total_late_count >= 0`),
	check("chk_attendance_monthly_aggregates_absent_non_negative", sql`total_absent_days >= 0`),
	check("chk_attendance_monthly_aggregates_leave_non_negative", sql`total_leave_days >= (0)::numeric`),
	check("chk_attendance_monthly_aggregates_overtime_non_negative", sql`total_overtime_minutes >= 0`),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	templateId: uuid("template_id"),
	type: notificationTypeEnum().notNull(),
	status: notificationStatusEnum().default('pending').notNull(),
	subject: text(),
	body: text(),
	metadata: jsonb(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_notifications_user_status").using("btree", table.userId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [notificationTemplates.id],
			name: "notifications_template_id_notification_templates_id_fk"
		}).onDelete("set null"),
]);

export const files = pgTable("files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	bucket: text().notNull(),
	ownerType: text("owner_type").notNull(),
	ownerId: uuid("owner_id").notNull(),
	purpose: text().notNull(),
	status: fileStatusEnum().default('temp').notNull(),
	mimeType: text("mime_type"),
	sizeBytes: integer("size_bytes"),
	sha256: text(),
	uploadedBy: uuid("uploaded_by"),
	finalizedAt: timestamp("finalized_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	finalizeAttempts: integer("finalize_attempts").default(0).notNull(),
	lastFinalizeAt: timestamp("last_finalize_at", { withTimezone: true, mode: 'string' }),
	lastFinalizeError: text("last_finalize_error"),
	thumbnailKey: text("thumbnail_key"),
	legalHoldAt: timestamp("legal_hold_at", { withTimezone: true, mode: 'string' }),
	retentionDays: integer("retention_days"),
	scanStatus: text("scan_status"),
	scanResult: text("scan_result"),
	scannedAt: timestamp("scanned_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_files_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	index("idx_files_owner").using("btree", table.ownerType.asc().nullsLast().op("uuid_ops"), table.ownerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_files_sha256_dedup").using("btree", table.sha256.asc().nullsLast().op("uuid_ops"), table.ownerId.asc().nullsLast().op("uuid_ops"), table.purpose.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("idx_files_status_expires").using("btree", table.status.asc().nullsLast().op("enum_ops"), table.expiresAt.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "files_uploaded_by_users_id_fk"
		}).onDelete("set null"),
	unique("files_key_unique").on(table.key),
]);

export const eventOutbox = pgTable("event_outbox", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	eventVersion: integer("event_version").default(1).notNull(),
	producerContext: text("producer_context").notNull(),
	aggregateId: uuid("aggregate_id"),
	correlationId: text("correlation_id"),
	causationId: text("causation_id"),
	payload: jsonb().default({}).notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	attemptCount: integer("attempt_count").default(0).notNull(),
	maxAttempts: integer("max_attempts").default(12).notNull(),
	lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: 'string' }),
	nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	leaseUntil: timestamp("lease_until", { withTimezone: true, mode: 'string' }),
	failedAt: timestamp("failed_at", { withTimezone: true, mode: 'string' }),
	lastError: text("last_error"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_outbox_dispatcher").using("btree", table.publishedAt.asc().nullsLast().op("timestamptz_ops"), table.nextAttemptAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_event_outbox_event_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_event_outbox_published_at").using("btree", table.publishedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const requestIdempotency = pgTable("request_idempotency", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorUserId: uuid("actor_user_id"),
	endpoint: text().notNull(),
	idempotencyKey: text("idempotency_key").notNull(),
	requestHash: text("request_hash"),
	status: requestIdempotencyStatusEnum().default('pending').notNull(),
	responsePayload: jsonb("response_payload"),
	errorPayload: jsonb("error_payload"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_request_idempotency_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_request_idempotency_actor_endpoint_key").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops"), table.endpoint.asc().nullsLast().op("text_ops"), table.idempotencyKey.asc().nullsLast().op("text_ops")),
]);

export const pendingFileFinalizations = pgTable("pending_file_finalizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileId: uuid("file_id").notNull(),
	ownerType: text("owner_type").notNull(),
	ownerId: uuid("owner_id").notNull(),
	targetKey: text("target_key").notNull(),
	attempts: integer().default(0).notNull(),
	lastError: text("last_error"),
	nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_pff_file_id").using("btree", table.fileId.asc().nullsLast().op("uuid_ops")),
	index("idx_pff_next_retry").using("btree", table.nextRetryAt.asc().nullsLast().op("int4_ops"), table.attempts.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "pending_file_finalizations_file_id_files_id_fk"
		}).onDelete("cascade"),
]);

export const accessAuditLogs = pgTable("access_audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorUserId: uuid("actor_user_id"),
	targetUserId: uuid("target_user_id"),
	action: text().notNull(),
	permissionCode: text("permission_code"),
	roleId: uuid("role_id"),
	reason: text(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_access_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_access_audit_logs_actor_user_id").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_access_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_access_audit_logs_target_user_id").using("btree", table.targetUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "access_audit_logs_actor_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.targetUserId],
			foreignColumns: [users.id],
			name: "access_audit_logs_target_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "access_audit_logs_role_id_roles_id_fk"
		}).onDelete("set null"),
]);

export const traceLogs = pgTable("trace_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	traceId: text("trace_id").notNull(),
	spanId: text("span_id").notNull(),
	parentSpanId: text("parent_span_id"),
	name: text().notNull(),
	correlationId: text("correlation_id"),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	durationMs: integer("duration_ms"),
	error: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_trace_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_trace_logs_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_trace_logs_trace_id").using("btree", table.traceId.asc().nullsLast().op("text_ops")),
]);

export const autoResponseAuditLog = pgTable("auto_response_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ruleId: uuid("rule_id").notNull(),
	anomalyType: text("anomaly_type").notNull(),
	severity: text().notNull(),
	actionType: text("action_type").notNull(),
	actionPayload: jsonb("action_payload"),
	result: text().notNull(),
	error: text(),
	anomalySnapshot: jsonb("anomaly_snapshot"),
	executedAt: timestamp("executed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_auto_response_audit_executed_at").using("btree", table.executedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_auto_response_audit_rule_id").using("btree", table.ruleId.asc().nullsLast().op("uuid_ops")),
]);

export const autoResponseRules = pgTable("auto_response_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	anomalyType: text("anomaly_type").notNull(),
	minSeverity: text("min_severity").default('warning').notNull(),
	actionType: text("action_type").notNull(),
	actionConfig: jsonb("action_config").default({}),
	cooldownSeconds: integer("cooldown_seconds").default(300).notNull(),
	maxActionsPerHour: integer("max_actions_per_hour").default(5).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	dryRun: boolean("dry_run").default(true).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_auto_response_rules_anomaly_type").using("btree", table.anomalyType.asc().nullsLast().op("text_ops")),
	index("idx_auto_response_rules_enabled").using("btree", table.isEnabled.asc().nullsLast().op("bool_ops")),
]);

export const accessDenials = pgTable("access_denials", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	permissionCode: text("permission_code").notNull(),
	reason: text().notNull(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_access_denials_permission_code").using("btree", table.permissionCode.asc().nullsLast().op("text_ops")),
	index("idx_access_denials_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "access_denials_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionCode],
			foreignColumns: [permissions.code],
			name: "access_denials_permission_code_permissions_code_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "access_denials_created_by_user_id_users_id_fk"
		}).onDelete("restrict"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorUserId: uuid("actor_user_id"),
	action: text().notNull(),
	entity: text().notNull(),
	entityId: text("entity_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	result: text(),
	reason: text(),
	traceId: text("trace_id"),
}, (table) => [
	index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_actor_user_id").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_audit_logs_entity_id").using("btree", table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_trace_id").using("btree", table.traceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const authorizationAuditLog = pgTable("authorization_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	action: text().notNull(),
	resource: text(),
	resourceId: text("resource_id"),
	allowed: boolean().notNull(),
	policyUsed: text("policy_used"),
	permissionsChecked: text("permissions_checked").array(),
	rolesActive: text("roles_active").array(),
	reason: text(),
	requestId: text("request_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_authz_audit_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_authz_audit_allowed").using("btree", table.allowed.asc().nullsLast().op("bool_ops")),
	index("idx_authz_audit_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_authz_audit_request_id").using("btree", table.requestId.asc().nullsLast().op("text_ops")),
	index("idx_authz_audit_resource_id").using("btree", table.resourceId.asc().nullsLast().op("text_ops")),
	index("idx_authz_audit_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "authorization_audit_log_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const refreshTokens = pgTable("refresh_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	userAgent: text("user_agent"),
	clientIp: text("client_ip"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	supersededAt: timestamp("superseded_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("refresh_tokens_token_idx").using("btree", table.tokenHash.asc().nullsLast().op("text_ops")),
	index("refresh_tokens_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "refresh_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const accessGrants = pgTable("access_grants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	permissionCode: text("permission_code").notNull(),
	reason: text().notNull(),
	approvedByUserId: uuid("approved_by_user_id").notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	revokedByUserId: uuid("revoked_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_access_grants_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_access_grants_permission_code").using("btree", table.permissionCode.asc().nullsLast().op("text_ops")),
	index("idx_access_grants_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "access_grants_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionCode],
			foreignColumns: [permissions.code],
			name: "access_grants_permission_code_permissions_code_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "access_grants_approved_by_user_id_users_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.revokedByUserId],
			foreignColumns: [users.id],
			name: "access_grants_revoked_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const permissions = pgTable("permissions", {
	code: text().primaryKey().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	level: integer().default(0).notNull(),
	type: text().default('custom').notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_code_unique").on(table.code),
	unique("roles_name_unique").on(table.name),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: text().notNull(),
	email: text(),
	passwordHash: text("password_hash"),
	passwordResetTokenHash: text("password_reset_token_hash"),
	passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at", { withTimezone: true, mode: 'string' }),
	mustChangePassword: boolean("must_change_password").default(false).notNull(),
	isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	authorizationVersion: integer("authorization_version").default(1).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const businessUnits = pgTable("business_units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }),
	headPositionId: uuid("head_position_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_business_units_head_position_id").using("btree", table.headPositionId.asc().nullsLast().op("uuid_ops")),
	unique("business_units_code_unique").on(table.code),
]);

export const departments = pgTable("departments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	code: text(),
	name: text().notNull(),
	description: text(),
	costCenterCode: text("cost_center_code"),
	businessUnitId: uuid("business_unit_id"),
	defaultCostCenterId: uuid("default_cost_center_id"),
	parentId: uuid("parent_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_departments_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	index("idx_departments_parent_id").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_departments_company_code").using("btree", table.code.asc().nullsLast().op("text_ops")).where(sql`(code IS NOT NULL)`),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "departments_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "departments_parent_id_departments_id_fk"
		}).onDelete("set null"),
]);

export const costCenters = pgTable("cost_centers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	budgetOwnerPositionId: uuid("budget_owner_position_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_cost_centers_budget_owner_position_id").using("btree", table.budgetOwnerPositionId.asc().nullsLast().op("uuid_ops")),
]);

export const locations = pgTable("locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	parentId: uuid("parent_id"),
	code: text().notNull(),
	name: text().notNull(),
	type: locationTypeEnum().notNull(),
	address: text(),
	timezone: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	radiusMeters: integer("radius_meters"),
	allowedIpCidrs: jsonb("allowed_ip_cidrs"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_locations_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	index("idx_locations_parent_id").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("idx_locations_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "locations_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "locations_parent_id_locations_id_fk"
		}).onDelete("set null"),
	unique("uq_locations_code").on(table.code),
]);

export const certifications = pgTable("certifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	name: text().notNull(),
	image: text(),
	fileId: uuid("file_id"),
	issuedBy: text("issued_by").notNull(),
	issuedDate: date("issued_date").notNull(),
	expiredDate: date("expired_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_certifications_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_certifications_file_id").using("btree", table.fileId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "certifications_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "certifications_file_id_files_id_fk"
		}).onDelete("set null"),
]);

export const employeeCompensations = pgTable("employee_compensations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	jobAssignmentId: uuid("job_assignment_id"),
	payType: varchar("pay_type", { length: 50 }).notNull(),
	baseAmount: numeric("base_amount", { precision: 12, scale:  2 }).notNull(),
	currencyCode: varchar("currency_code", { length: 3 }).notNull(),
	payFrequency: payFrequencyEnum("pay_frequency"),
	effectiveStartDate: date("effective_start_date").notNull(),
	effectiveEndDate: date("effective_end_date"),
	changeReason: varchar("change_reason", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_employee_compensations_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_compensations_job_assignment_id").using("btree", table.jobAssignmentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_compensations_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.jobAssignmentId],
			foreignColumns: [jobAssignments.id],
			name: "employee_compensations_job_assignment_id_job_assignments_id_fk"
		}),
]);

export const employeeDocuments = pgTable("employee_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	fileId: uuid("file_id").notNull(),
	documentType: text("document_type").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_documents_document_active").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops"), table.documentType.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_employee_documents_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_documents_file_id").using("btree", table.fileId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_employee_documents_active_type").using("btree", table.employeeId.asc().nullsLast().op("text_ops"), table.documentType.asc().nullsLast().op("uuid_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_documents_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "employee_documents_file_id_files_id_fk"
		}).onDelete("cascade"),
]);

export const employeeEquipmentHandoverItems = pgTable("employee_equipment_handover_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	handoverId: uuid("handover_id").notNull(),
	itemName: text("item_name").notNull(),
	serialNumber: text("serial_number"),
	quantity: integer().default(1).notNull(),
	note: text(),
	documentId: uuid("document_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_equipment_handover_items_document_id").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_equipment_handover_items_handover_id").using("btree", table.handoverId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.handoverId],
			foreignColumns: [employeeEquipmentHandovers.id],
			name: "employee_equipment_handover_items_handover_id_employee_equipmen"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [files.id],
			name: "employee_equipment_handover_items_document_id_files_id_fk"
		}).onDelete("set null"),
	check("chk_employee_equipment_handover_items_quantity_positive", sql`quantity > 0`),
]);

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	legalName: text("legal_name"),
	taxCode: text("tax_code"),
	registrationNumber: text("registration_number"),
	currency: text().default('VND').notNull(),
	timezone: text().default('Asia/Ho_Chi_Minh').notNull(),
	status: companyStatusEnum().default('active').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_companies_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	unique("companies_code_unique").on(table.code),
]);

export const employeeContracts = pgTable("employee_contracts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	employmentRecordId: uuid("employment_record_id"),
	contractNumber: text("contract_number"),
	contractType: contractTypeEnum("contract_type").default('permanent').notNull(),
	status: contractStatusEnum().default('active').notNull(),
	version: integer().default(1).notNull(),
	signedAt: date("signed_at"),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	fileUrl: text("file_url"),
	note: text(),
	previousContractId: uuid("previous_contract_id"),
	isCurrent: boolean("is_current").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_contracts_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_contracts_employment_record_id").using("btree", table.employmentRecordId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_contracts_is_current").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_employee_contracts_current_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`(is_current = true)`),
	foreignKey({
			columns: [table.employmentRecordId],
			foreignColumns: [employmentRecords.id],
			name: "employee_contracts_employment_record_id_employment_records_id_f"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_contracts_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	unique("uq_employee_contracts_employee_version").on(table.employeeId, table.version),
	check("chk_employee_contracts_date_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const orgAssignments = pgTable("org_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	departmentId: uuid("department_id"),
	jobTitle: text("job_title"),
	assignmentType: orgAssignmentTypeEnum("assignment_type").default('primary').notNull(),
	managerEmployeeId: uuid("manager_employee_id"),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	isCurrent: boolean("is_current").default(true).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_org_assignments_department_id").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_org_assignments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_org_assignments_is_current").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")),
	index("idx_org_assignments_manager_employee_id").using("btree", table.managerEmployeeId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_org_assignments_current_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`((is_current = true) AND (assignment_type = 'primary'::org_assignment_type_enum))`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "org_assignments_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "org_assignments_department_id_departments_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.managerEmployeeId],
			foreignColumns: [employees.id],
			name: "org_assignments_manager_employee_id_employees_id_fk"
		}).onDelete("set null"),
	check("chk_org_assignments_date_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const jobAssignments = pgTable("job_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	positionId: uuid("position_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	isPrimary: boolean("is_primary").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_job_assignments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_job_assignments_position_id").using("btree", table.positionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "job_assignments_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [positions.id],
			name: "job_assignments_position_id_positions_id_fk"
		}),
]);

export const employeeEquipmentHandovers = pgTable("employee_equipment_handovers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	documentId: uuid("document_id"),
	status: text().default('completed').notNull(),
	handedOverAt: timestamp("handed_over_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_equipment_handovers_document_id").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_equipment_handovers_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_equipment_handovers_handed_over_at").using("btree", table.handedOverAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_equipment_handovers_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [files.id],
			name: "employee_equipment_handovers_document_id_files_id_fk"
		}).onDelete("set null"),
]);

export const employees = pgTable("employees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	employeeCode: text("employee_code").notNull(),
	avatarFileId: uuid("avatar_file_id"),
	dob: date(),
	gender: genderEnum().default('unknown'),
	parentBranchId: uuid("parent_branch_id"),
	address: text(),
	phoneNumber: text("phone_number"),
	personalEmail: text("personal_email"),
	workEmail: text("work_email"),
	branchId: uuid("branch_id"),
	locationId: uuid("location_id"),
	currentEmploymentRecordId: uuid("current_employment_record_id"),
	currentOrgAssignmentId: uuid("current_org_assignment_id"),
	currentSalaryStructureId: uuid("current_salary_structure_id"),
	departmentId: uuid("department_id"),
	startDate: date("start_date"),
	endDate: date("end_date"),
	lastWorkingDate: date("last_working_date"),
	version: integer().default(1).notNull(),
	status: employeeStatusEnum().default('working').notNull(),
	probationEndDate: date("probation_end_date"),
	identityNumber: text("identity_number"),
	identityDate: date("identity_date"),
	identityPlace: text("identity_place"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactPhone: text("emergency_contact_phone"),
	bankAccountNumber: text("bank_account_number"),
	bankName: text("bank_name"),
	taxCode: text("tax_code"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	highestEducationLevel: educationLevelEnum("highest_education_level"),
}, (table) => [
	index("idx_employees_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_current_employment_record_id").using("btree", table.currentEmploymentRecordId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_current_org_assignment_id").using("btree", table.currentOrgAssignmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_current_salary_structure_id").using("btree", table.currentSalaryStructureId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_employees_department_id").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_employee_code").using("btree", table.employeeCode.asc().nullsLast().op("text_ops")),
	index("idx_employees_identity_number").using("btree", table.identityNumber.asc().nullsLast().op("text_ops")),
	index("idx_employees_location_id").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("idx_employees_name").using("btree", table.firstName.asc().nullsLast().op("text_ops"), table.lastName.asc().nullsLast().op("text_ops")),
	index("idx_employees_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_employees_personal_email").using("btree", table.personalEmail.asc().nullsLast().op("text_ops")).where(sql`(personal_email IS NOT NULL)`),
	uniqueIndex("uq_employees_work_email").using("btree", table.workEmail.asc().nullsLast().op("text_ops")).where(sql`(work_email IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "employees_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "employees_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "employees_location_id_locations_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.currentEmploymentRecordId],
			foreignColumns: [employmentRecords.id],
			name: "employees_current_employment_record_id_employment_records_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.currentOrgAssignmentId],
			foreignColumns: [orgAssignments.id],
			name: "employees_current_org_assignment_id_org_assignments_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.currentSalaryStructureId],
			foreignColumns: [salaryStructures.id],
			name: "employees_current_salary_structure_id_salary_structures_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "employees_department_id_departments_id_fk"
		}).onDelete("set null"),
	unique("uq_employees_user_id").on(table.userId),
	unique("employees_employee_code_unique").on(table.employeeCode),
	check("chk_employees_date_range", sql`(end_date IS NULL) OR (start_date IS NULL) OR (start_date <= end_date)`),
]);

export const attendanceEvents = pgTable("attendance_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	type: attendanceEventTypeEnum().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	source: attendanceEventSourceEnum().default('DEVICE').notNull(),
	locationId: uuid("location_id"),
	idempotencyKey: text("idempotency_key"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_events_employee_date").using("btree", table.employeeId.asc().nullsLast().op("timestamptz_ops"), table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("idx_attendance_events_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_events_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_events_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "attendance_events_location_id_locations_id_fk"
		}).onDelete("set null"),
	unique("attendance_events_idempotency_key_unique").on(table.idempotencyKey),
]);

export const attendanceDailySummaries = pgTable("attendance_daily_summaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	employeeShiftAssignmentId: uuid("employee_shift_assignment_id"),
	leaveRequestId: uuid("leave_request_id"),
	workDate: date("work_date").notNull(),
	status: attendanceSummaryStatusEnum().default('present').notNull(),
	scheduledMinutes: integer("scheduled_minutes").default(0).notNull(),
	workedMinutes: integer("worked_minutes").default(0).notNull(),
	breakMinutes: integer("break_minutes").default(0).notNull(),
	lateMinutes: integer("late_minutes").default(0).notNull(),
	earlyLeaveMinutes: integer("early_leave_minutes").default(0).notNull(),
	overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
	isHoliday: boolean("is_holiday").default(false).notNull(),
	anomalyFlags: jsonb("anomaly_flags"),
	sourceData: jsonb("source_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_daily_summaries_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_daily_summaries_employee_shift").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops"), table.employeeShiftAssignmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_daily_summaries_leave_request_id").using("btree", table.leaveRequestId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_daily_summaries_shift_assignment_id").using("btree", table.employeeShiftAssignmentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leaveRequestId],
			foreignColumns: [leaveRequests.id],
			name: "attendance_daily_summaries_leave_request_id_leave_requests_id_f"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_daily_summaries_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	unique("uq_attendance_daily_summaries_employee_date").on(table.employeeId, table.workDate),
]);

export const employmentRecords = pgTable("employment_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	managerEmployeeId: uuid("manager_employee_id"),
	note: text(),
	isCurrent: boolean("is_current").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employment_records_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employment_records_is_current").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")),
	index("idx_employment_records_manager_employee_id").using("btree", table.managerEmployeeId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_employment_records_current_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`(is_current = true)`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employment_records_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.managerEmployeeId],
			foreignColumns: [employees.id],
			name: "employment_records_manager_employee_id_employees_id_fk"
		}).onDelete("set null"),
	check("chk_employment_records_date_range", sql`(end_date IS NULL) OR (start_date <= end_date)`),
]);

export const employeeIdentifiers = pgTable("employee_identifiers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	identifierType: varchar("identifier_type", { length: 50 }).notNull(),
	identifierValue: varchar("identifier_value", { length: 255 }).notNull(),
	issuingCountry: varchar("issuing_country", { length: 2 }),
	issuedDate: date("issued_date"),
	expiryDate: date("expiry_date"),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_identifiers_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_identifiers_value").using("btree", table.identifierValue.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_identifiers_employee_id_employees_id_fk"
		}).onDelete("cascade"),
]);

export const employeeStatusHistory = pgTable("employee_status_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	status: employeeStatusEnum().notNull(),
	notes: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	changedBy: uuid("changed_by"),
}, (table) => [
	index("idx_employee_status_history_changed_by").using("btree", table.changedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_status_history_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_status_history_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.changedBy],
			foreignColumns: [users.id],
			name: "employee_status_history_changed_by_users_id_fk"
		}).onDelete("set null"),
]);

export const positions = pgTable("positions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	jobCategory: jobCategoryEnum("job_category").default('other').notNull(),
}, (table) => [
	index("idx_positions_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("positions_name_unique").on(table.name),
]);

export const attendanceSessions = pgTable("attendance_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	assignmentId: text("assignment_id"),
	sessionType: attendanceSessionTypeEnum("session_type").notNull(),
	status: attendanceSessionStatusEnum().default('READY').notNull(),
	date: date().notNull(),
	plannedStart: text("planned_start"),
	plannedEnd: text("planned_end"),
	actualStart: timestamp("actual_start", { withTimezone: true, mode: 'string' }),
	actualEnd: timestamp("actual_end", { withTimezone: true, mode: 'string' }),
	timezone: text().default('Asia/Ho_Chi_Minh'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_sessions_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_sessions_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_sessions_employee_date").using("btree", table.employeeId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_sessions_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_attendance_active_session").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'IN_PROGRESS'::attendance_session_status_enum)`),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_sessions_employee_id_employees_id_fk"
		}).onDelete("cascade"),
]);

export const attendanceSummaryOverrides = pgTable("attendance_summary_overrides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	workDate: date("work_date").notNull(),
	reason: attendanceOverrideReasonEnum().notNull(),
	note: text(),
	overriddenStatus: attendanceSummaryStatusEnum("overridden_status"),
	overriddenWorkedMinutes: integer("overridden_worked_minutes"),
	overriddenLateMinutes: integer("overridden_late_minutes"),
	overriddenEarlyLeaveMinutes: integer("overridden_early_leave_minutes"),
	overriddenOvertimeMinutes: integer("overridden_overtime_minutes"),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_summary_overrides_employee_date").using("btree", table.employeeId.asc().nullsLast().op("date_ops"), table.workDate.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_summary_overrides_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_summary_overrides_work_date").using("btree", table.workDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_summary_overrides_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "attendance_summary_overrides_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_attendance_summary_overrides_employee_date").on(table.employeeId, table.workDate),
]);

export const attendances = pgTable("attendances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	sessionId: uuid("session_id"),
	type: attendanceTypeEnum().notNull(),
	time: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	date: date().notNull(),
	session: attendanceSessionEnum(),
	image: text(),
	location: text(),
	locationId: uuid("location_id"),
	note: text(),
	lunchDutyType: lunchDutyTypeEnum("lunch_duty_type"),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	distanceMeters: integer("distance_meters"),
	ipAddress: text("ip_address"),
	selfieS3Key: text("selfie_s3_key"),
	verificationStatus: punchVerificationStatusEnum("verification_status"),
	flags: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	source: attendanceSourceEnum().default('api'),
}, (table) => [
	index("idx_attendances_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendances_employee_date").using("btree", table.employeeId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("uuid_ops")),
	index("idx_attendances_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendances_employee_time").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops"), table.time.asc().nullsLast().op("uuid_ops")),
	index("idx_attendances_location_id").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendances_session").using("btree", table.session.asc().nullsLast().op("enum_ops")),
	index("idx_attendances_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("idx_attendances_verification_status").using("btree", table.verificationStatus.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendances_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [attendanceSessions.id],
			name: "attendances_session_id_attendance_sessions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "attendances_location_id_locations_id_fk"
		}).onDelete("set null"),
	unique("uq_attendances_employee_date_session_type").on(table.employeeId, table.type, table.date, table.session),
]);

export const gpsLogs = pgTable("gps_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	latitude: numeric({ precision: 10, scale:  7 }).notNull(),
	longitude: numeric({ precision: 10, scale:  7 }).notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_gps_logs_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_gps_logs_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "gps_logs_employee_id_employees_id_fk"
		}).onDelete("cascade"),
]);

export const leavePolicyAssignments = pgTable("leave_policy_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	policyId: uuid("policy_id").notNull(),
	employeeId: uuid("employee_id").notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_policy_assignments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_policy_assignments_policy_id").using("btree", table.policyId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_leave_policy_assignments_current_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")).where(sql`(effective_to IS NULL)`),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [leavePolicies.id],
			name: "leave_policy_assignments_policy_id_leave_policies_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "leave_policy_assignments_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	check("chk_leave_policy_assignments_date_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const schedulesNew = pgTable("schedules_new", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	date: date().notNull(),
	status: text().default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	publishedBy: uuid("published_by"),
	lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }),
	lockedBy: uuid("locked_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_schedules_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_schedules_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.publishedBy],
			foreignColumns: [users.id],
			name: "schedules_new_published_by_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lockedBy],
			foreignColumns: [users.id],
			name: "schedules_new_locked_by_users_id_fk"
		}).onDelete("set null"),
	unique("schedules_new_date_unique").on(table.date),
]);

export const leavePolicies = pgTable("leave_policies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_policies_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "leave_policies_branch_id_branches_id_fk"
		}).onDelete("set null"),
	unique("uq_leave_policies_company_code").on(table.code),
	check("chk_leave_policies_date_range", sql`(effective_to IS NULL) OR (effective_from <= effective_to)`),
]);

export const attendanceOvertimeRequests = pgTable("attendance_overtime_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	workDate: date("work_date").notNull(),
	candidateMinutes: integer("candidate_minutes").default(0).notNull(),
	requestedMinutes: integer("requested_minutes").notNull(),
	approvedMinutes: integer("approved_minutes").default(0).notNull(),
	status: overtimeStatusEnum().default('pending').notNull(),
	requestNote: text("request_note"),
	rejectionReason: text("rejection_reason"),
	approvedByUserId: uuid("approved_by_user_id"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_ot_approved_by").using("btree", table.approvedByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_ot_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_ot_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_attendance_ot_work_date").using("btree", table.workDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_overtime_requests_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "attendance_overtime_requests_approved_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_attendance_ot_employee_date").on(table.employeeId, table.workDate),
]);

export const leaveRequests = pgTable("leave_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	approverUserId: uuid("approver_user_id"),
	status: leaveRequestStatusEnum().default('pending').notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	startSession: leaveSessionEnum("start_session").default('full_day').notNull(),
	endSession: leaveSessionEnum("end_session").default('full_day').notNull(),
	totalUnits: numeric("total_units", { precision: 8, scale:  2 }).notNull(),
	reason: text(),
	note: text(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_requests_approver_user_id").using("btree", table.approverUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_requests_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_requests_leave_type_id").using("btree", table.leaveTypeId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_requests_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "leave_requests_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_requests_leave_type_id_leave_types_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.approverUserId],
			foreignColumns: [users.id],
			name: "leave_requests_approver_user_id_users_id_fk"
		}).onDelete("set null"),
	check("chk_leave_requests_date_range", sql`start_date <= end_date`),
]);

export const leaveBalances = pgTable("leave_balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	leaveTypeId: uuid("leave_type_id").notNull(),
	balanceYear: integer("balance_year").notNull(),
	openingBalance: numeric("opening_balance", { precision: 8, scale:  2 }).default('0').notNull(),
	accruedAmount: numeric("accrued_amount", { precision: 8, scale:  2 }).default('0').notNull(),
	usedAmount: numeric("used_amount", { precision: 8, scale:  2 }).default('0').notNull(),
	carriedOverAmount: numeric("carried_over_amount", { precision: 8, scale:  2 }).default('0').notNull(),
	adjustedAmount: numeric("adjusted_amount", { precision: 8, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_balances_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_balances_leave_type_id").using("btree", table.leaveTypeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "leave_balances_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_balances_leave_type_id_leave_types_id_fk"
		}).onDelete("cascade"),
	unique("uq_leave_balances_employee_type_year").on(table.employeeId, table.leaveTypeId, table.balanceYear),
]);

export const leaveTypes = pgTable("leave_types", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	policyId: uuid("policy_id"),
	code: text().notNull(),
	name: text().notNull(),
	unit: leaveUnitEnum().default('day').notNull(),
	isPaid: boolean("is_paid").default(true).notNull(),
	requiresApproval: boolean("requires_approval").default(true).notNull(),
	maxDaysPerYear: numeric("max_days_per_year", { precision: 8, scale:  2 }),
	minNoticeHours: integer("min_notice_hours"),
	color: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_types_policy_id").using("btree", table.policyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [leavePolicies.id],
			name: "leave_types_policy_id_leave_policies_id_fk"
		}).onDelete("set null"),
	unique("uq_leave_types_company_code").on(table.code),
]);

export const holidayCalendars = pgTable("holiday_calendars", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	code: text().notNull(),
	name: text().notNull(),
	timezone: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_holiday_calendars_branch_id").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "holiday_calendars_branch_id_branches_id_fk"
		}).onDelete("set null"),
	unique("uq_holiday_calendars_company_code").on(table.code),
]);

export const holidays = pgTable("holidays", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	holidayCalendarId: uuid("holiday_calendar_id").notNull(),
	name: text().notNull(),
	holidayDate: date("holiday_date").notNull(),
	isPaid: boolean("is_paid").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_holidays_holiday_calendar_id").using("btree", table.holidayCalendarId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.holidayCalendarId],
			foreignColumns: [holidayCalendars.id],
			name: "holidays_holiday_calendar_id_holiday_calendars_id_fk"
		}).onDelete("cascade"),
	unique("uq_holidays_calendar_date").on(table.holidayCalendarId, table.holidayDate),
]);

export const scheduleRequests = pgTable("schedule_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	date: date().notNull(),
	requestType: scheduleRequestTypeEnum("request_type").notNull(),
	reason: text(),
	status: scheduleRequestStatusEnum().default('PENDING').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_schedule_requests_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_schedule_requests_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_schedule_requests_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "schedule_requests_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "schedule_requests_reviewed_by_users_id_fk"
		}).onDelete("set null"),
]);

export const scheduleRequirements = pgTable("schedule_requirements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scheduleId: uuid("schedule_id").notNull(),
	locationId: uuid("location_id"),
	workRoleId: uuid("work_role_id"),
	shiftTemplateId: uuid("shift_template_id"),
	requiredCount: integer("required_count").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_req_location").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("idx_req_schedule").using("btree", table.scheduleId.asc().nullsLast().op("uuid_ops")),
	index("idx_req_shift").using("btree", table.shiftTemplateId.asc().nullsLast().op("uuid_ops")),
	index("idx_req_work_role").using("btree", table.workRoleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [schedulesNew.id],
			name: "schedule_requirements_schedule_id_schedules_new_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "schedule_requirements_location_id_locations_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workRoleId],
			foreignColumns: [workRoles.id],
			name: "schedule_requirements_work_role_id_work_roles_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.shiftTemplateId],
			foreignColumns: [shiftTemplates.id],
			name: "schedule_requirements_shift_template_id_shift_templates_id_fk"
		}).onDelete("set null"),
	unique("uq_schedule_requirement_slot").on(table.scheduleId, table.locationId, table.workRoleId, table.shiftTemplateId),
]);

export const shiftRosterPublications = pgTable("shift_roster_publications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id"),
	departmentId: uuid("department_id"),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: text().default('draft').notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	submittedByUserId: uuid("submitted_by_user_id"),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedByUserId: uuid("approved_by_user_id"),
	rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: 'string' }),
	rejectedByUserId: uuid("rejected_by_user_id"),
	rejectionReason: text("rejection_reason"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	publishedByUserId: uuid("published_by_user_id"),
	lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }),
	lockedByUserId: uuid("locked_by_user_id"),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shift_roster_publications_period").using("btree", table.periodStart.asc().nullsLast().op("date_ops"), table.periodEnd.asc().nullsLast().op("date_ops")),
	index("idx_shift_roster_publications_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "shift_roster_publications_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "shift_roster_publications_department_id_departments_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.submittedByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_publications_submitted_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_publications_approved_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.rejectedByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_publications_rejected_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.publishedByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_publications_published_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lockedByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_publications_locked_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_shift_roster_publications_period").on(table.branchId, table.departmentId, table.periodStart, table.periodEnd),
]);

export const shiftRosterVersionSnapshots = pgTable("shift_roster_version_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	rosterPublicationId: uuid("roster_publication_id").notNull(),
	version: integer().notNull(),
	snapshotData: jsonb("snapshot_data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdByUserId: uuid("created_by_user_id"),
}, (table) => [
	index("idx_shift_roster_version_snapshots_pub_id").using("btree", table.rosterPublicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.rosterPublicationId],
			foreignColumns: [shiftRosterPublications.id],
			name: "shift_roster_version_snapshots_roster_publication_id_shift_rost"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "shift_roster_version_snapshots_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_shift_roster_version_snapshots_roster_version").on(table.rosterPublicationId, table.version),
]);

export const employeeQualifications = pgTable("employee_qualifications", {
	employeeId: uuid("employee_id").notNull(),
	positionId: uuid("position_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_qualifications_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_qualifications_position_id").using("btree", table.positionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_qualifications_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [workRoles.id],
			name: "employee_qualifications_position_id_work_roles_id_fk"
		}).onDelete("cascade"),
	unique("uq_employee_qualifications").on(table.employeeId, table.positionId),
]);

export const employeeShiftAssignments = pgTable("employee_shift_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	shiftTemplateId: uuid("shift_template_id"),
	positionId: uuid("position_id"),
	locationId: uuid("location_id"),
	scheduleId: uuid("schedule_id"),
	assignmentDate: date("assignment_date").notNull(),
	effectiveFrom: date("effective_from"),
	effectiveTo: date("effective_to"),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelledBy: uuid("cancelled_by"),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'string' }),
	status: shiftAssignmentStatusEnum().default('planned').notNull(),
	note: text(),
	snapshotShiftName: text("snapshot_shift_name"),
	snapshotStartTime: time("snapshot_start_time"),
	snapshotEndTime: time("snapshot_end_time"),
	snapshotBreakMinutes: integer("snapshot_break_minutes"),
	snapshotLocationName: text("snapshot_location_name"),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_employee_shift_assignments_assignment_date").using("btree", table.assignmentDate.asc().nullsLast().op("date_ops")),
	index("idx_employee_shift_assignments_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_shift_assignments_location_id").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("idx_employee_shift_assignments_shift_template_id").using("btree", table.shiftTemplateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.shiftTemplateId],
			foreignColumns: [shiftTemplates.id],
			name: "employee_shift_assignments_shift_template_id_shift_templates_id"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "employee_shift_assignments_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.positionId],
			foreignColumns: [workRoles.id],
			name: "employee_shift_assignments_position_id_work_roles_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "employee_shift_assignments_location_id_locations_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [schedulesNew.id],
			name: "employee_shift_assignments_schedule_id_schedules_new_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.cancelledBy],
			foreignColumns: [users.id],
			name: "employee_shift_assignments_cancelled_by_users_id_fk"
		}),
	unique("uq_employee_shift_assignments_employee_date").on(table.employeeId, table.assignmentDate),
]);

export const schedules = pgTable("schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: 'string' }).notNull(),
	effectiveTo: timestamp("effective_to", { withTimezone: true, mode: 'string' }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_schedules_employee_id").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "schedules_employee_id_employees_id_fk"
		}).onDelete("cascade"),
]);

export const approvalSteps = pgTable("approval_steps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requestId: uuid("request_id").notNull(),
	stepIndex: integer("step_index").notNull(),
	status: approvalStepStatusEnum().default('pending').notNull(),
	approverUserId: uuid("approver_user_id"),
	decidedByUserId: uuid("decided_by_user_id"),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	comment: text(),
	payload: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_approval_steps_approver_user_id").using("btree", table.approverUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_approval_steps_request_id").using("btree", table.requestId.asc().nullsLast().op("uuid_ops")),
	index("idx_approval_steps_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [approvalRequests.id],
			name: "approval_steps_request_id_approval_requests_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.approverUserId],
			foreignColumns: [users.id],
			name: "approval_steps_approver_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.decidedByUserId],
			foreignColumns: [users.id],
			name: "approval_steps_decided_by_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("uq_approval_steps_request_step").on(table.requestId, table.stepIndex),
]);

export const leaveApprovalLinks = pgTable("leave_approval_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	leaveRequestId: uuid("leave_request_id").notNull(),
	approvalRequestId: uuid("approval_request_id").notNull(),
	policyId: uuid("policy_id"),
	status: approvalRequestStatusEnum().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_leave_approval_links_approval_request_id").using("btree", table.approvalRequestId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_approval_links_leave_request_id").using("btree", table.leaveRequestId.asc().nullsLast().op("uuid_ops")),
	index("idx_leave_approval_links_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.approvalRequestId],
			foreignColumns: [approvalRequests.id],
			name: "leave_approval_links_approval_request_id_approval_requests_id_f"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leaveRequestId],
			foreignColumns: [leaveRequests.id],
			name: "leave_approval_links_leave_request_id_leave_requests_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [approvalPolicies.id],
			name: "leave_approval_links_policy_id_approval_policies_id_fk"
		}).onDelete("set null"),
	unique("leave_approval_links_leave_request_id_unique").on(table.leaveRequestId),
	unique("leave_approval_links_approval_request_id_unique").on(table.approvalRequestId),
]);

export const chatConversations = pgTable("chat_conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: chatConversationTypeEnum().notNull(),
	name: text(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chat_conversations_created_by").using("btree", table.createdByUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_chat_conversations_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("idx_chat_conversations_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "chat_conversations_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const chatMessageReads = pgTable("chat_message_reads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id").notNull(),
	lastReadMessageId: uuid("last_read_message_id"),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chat_message_reads_conversation").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("idx_chat_message_reads_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_message_reads_conversation_id_chat_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_message_reads_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.lastReadMessageId],
			foreignColumns: [chatMessages.id],
			name: "chat_message_reads_last_read_message_id_chat_messages_id_fk"
		}).onDelete("set null"),
	unique("uq_chat_message_reads_conv_user").on(table.conversationId, table.userId),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderUserId: uuid("sender_user_id"),
	type: chatMessageTypeEnum().default('text').notNull(),
	content: text(),
	attachments: jsonb(),
	status: chatMessageStatusEnum().default('sent').notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chat_messages_conv_created").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_chat_messages_conversation").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("idx_chat_messages_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_chat_messages_sender").using("btree", table.senderUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_messages_conversation_id_chat_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderUserId],
			foreignColumns: [users.id],
			name: "chat_messages_sender_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const chatParticipants = pgTable("chat_participants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: chatParticipantRoleEnum().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chat_participants_conversation").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("idx_chat_participants_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_participants_conversation_id_chat_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_participants_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("uq_chat_participants_conv_user").on(table.conversationId, table.userId),
]);

export const systemHealthChecks = pgTable("system_health_checks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	component: text().notNull(),
	status: text().notNull(),
	latencyMs: integer("latency_ms"),
	error: text(),
	details: jsonb(),
	checkedAt: timestamp("checked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_health_checks_checked_at").using("btree", table.checkedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_health_checks_component").using("btree", table.component.asc().nullsLast().op("text_ops")),
]);

export const approvalPolicies = pgTable("approval_policies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	version: integer().default(1).notNull(),
	name: text(),
	description: text(),
	steps: jsonb().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_approval_policies_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_approval_policies_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("uq_approval_policies_key_version").on(table.key, table.version),
]);

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	targetUrl: text("target_url").notNull(),
	secret: text().notNull(),
	status: webhookSubscriptionStatusEnum().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_webhook_subscriptions_event_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subscriptionId: uuid("subscription_id").notNull(),
	eventId: uuid("event_id").notNull(),
	eventType: text("event_type").notNull(),
	attemptCount: integer("attempt_count").default(0).notNull(),
	nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	leaseUntil: timestamp("lease_until", { withTimezone: true, mode: 'string' }),
	lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: 'string' }),
	lastError: text("last_error"),
	status: webhookDeliveryStatusEnum().default('pending').notNull(),
	requestHeaders: jsonb("request_headers").default({}).notNull(),
	payload: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_webhook_deliveries_pending").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.nextAttemptAt.asc().nullsLast().op("timestamptz_ops")),
	uniqueIndex("uniq_webhook_delivery_sub_event").using("btree", table.subscriptionId.asc().nullsLast().op("uuid_ops"), table.eventId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [webhookSubscriptions.id],
			name: "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk"
		}).onDelete("cascade"),
]);

export const branches = pgTable("branches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	code: text().notNull(),
	name: text().notNull(),
	parentBranchId: uuid("parent_branch_id"),
	address: text(),
	phoneNumber: text("phone_number"),
	email: text(),
	isHeadquarters: boolean("is_headquarters").default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_branches_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	index("idx_branches_parent_id").using("btree", table.parentBranchId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "branches_company_id_companies_id_fk"
		}).onDelete("cascade"),
	unique("uq_branches_company_code").on(table.companyId, table.code),
]);

export const shiftRosterLifecycleHistory = pgTable("shift_roster_lifecycle_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	rosterPublicationId: uuid("roster_publication_id").notNull(),
	action: text().notNull(),
	fromStatus: text("from_status"),
	toStatus: text("to_status").notNull(),
	actorUserId: uuid("actor_user_id"),
	reason: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shift_roster_lifecycle_history_publication_id").using("btree", table.rosterPublicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.rosterPublicationId],
			foreignColumns: [shiftRosterPublications.id],
			name: "shift_roster_lifecycle_history_roster_publication_id_shift_rost"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "shift_roster_lifecycle_history_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const workflowInstanceTransitions = pgTable("workflow_instance_transitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instanceId: uuid("instance_id").notNull(),
	fromState: text("from_state"),
	toState: text("to_state").notNull(),
	transition: text().notNull(),
	actorUserId: uuid("actor_user_id"),
	payload: jsonb(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_workflow_instance_transitions_instance_id").using("btree", table.instanceId.asc().nullsLast().op("uuid_ops")),
	index("idx_workflow_instance_transitions_occurred_at").using("btree", table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.instanceId],
			foreignColumns: [workflowInstances.id],
			name: "workflow_instance_transitions_instance_id_workflow_instances_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "workflow_instance_transitions_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const approvalRequests = pgTable("approval_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	policyId: uuid("policy_id").notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: text("subject_id").notNull(),
	status: approvalRequestStatusEnum().default('pending').notNull(),
	currentStepIndex: integer("current_step_index").default(0).notNull(),
	requestedByUserId: uuid("requested_by_user_id"),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_approval_requests_policy_id").using("btree", table.policyId.asc().nullsLast().op("uuid_ops")),
	index("idx_approval_requests_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_approval_requests_subject").using("btree", table.subjectType.asc().nullsLast().op("text_ops"), table.subjectId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [approvalPolicies.id],
			name: "approval_requests_policy_id_approval_policies_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.requestedByUserId],
			foreignColumns: [users.id],
			name: "approval_requests_requested_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const attendanceViolations = pgTable("attendance_violations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id"),
	employeeId: uuid("employee_id").notNull(),
	code: text().notNull(),
	severity: violationSeverityEnum().notNull(),
	status: violationStatusEnum().default('OPEN').notNull(),
	autoResolvable: boolean("auto_resolvable").default(false).notNull(),
	requiresApproval: boolean("requires_approval").default(false).notNull(),
	detectedAt: timestamp("detected_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attendance_violations_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_attendance_violations_employee").using("btree", table.employeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_violations_session").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_violations_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [attendanceSessions.id],
			name: "attendance_violations_session_id_attendance_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_violations_employee_id_employees_id_fk"
		}).onDelete("cascade"),
]);

export const permissionHierarchy = pgTable("permission_hierarchy", {
	parentPermission: text("parent_permission").notNull(),
	childPermission: text("child_permission").notNull(),
}, (table) => [
	index("idx_perm_hierarchy_child").using("btree", table.childPermission.asc().nullsLast().op("text_ops")),
	index("idx_perm_hierarchy_parent").using("btree", table.parentPermission.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentPermission],
			foreignColumns: [permissions.code],
			name: "permission_hierarchy_parent_permission_permissions_code_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.childPermission],
			foreignColumns: [permissions.code],
			name: "permission_hierarchy_child_permission_permissions_code_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.parentPermission, table.childPermission], name: "pk_permission_hierarchy"}),
]);

export const consumerIdempotency = pgTable("consumer_idempotency", {
	consumerId: text("consumer_id").notNull(),
	eventId: uuid("event_id").notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_consumer_idempotency_event_id").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")),
	primaryKey({ columns: [table.consumerId, table.eventId], name: "consumer_idempotency_consumer_id_event_id_pk"}),
]);

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid("role_id").notNull(),
	permissionCode: text("permission_code").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_role_permissions_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_role_id_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionCode],
			foreignColumns: [permissions.code],
			name: "role_permissions_permission_code_permissions_code_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.roleId, table.permissionCode], name: "pk_role_permissions"}),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
}, (table) => [
	index("idx_user_roles_granted_by").using("btree", table.grantedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_user_roles_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_roles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [users.id],
			name: "user_roles_granted_by_users_id_fk"
		}).onDelete("set null"),
	primaryKey({ columns: [table.userId, table.roleId], name: "pk_user_roles"}),
]);

export const userPermissions = pgTable("user_permissions", {
	userId: uuid("user_id").notNull(),
	permissionCode: text("permission_code").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_user_permissions_permission_code").using("btree", table.permissionCode.asc().nullsLast().op("text_ops")),
	index("idx_user_permissions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_permissions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionCode],
			foreignColumns: [permissions.code],
			name: "user_permissions_permission_code_permissions_code_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [users.id],
			name: "user_permissions_granted_by_users_id_fk"
		}).onDelete("set null"),
	primaryKey({ columns: [table.userId, table.permissionCode], name: "pk_user_permissions"}),
]);
