CREATE TYPE "public"."file_status_enum" AS ENUM('temp', 'active', 'archived', 'replaced', 'orphan', 'finalize_failed', 'pending_upload');--> statement-breakpoint
CREATE TYPE "public"."request_idempotency_status_enum" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."company_status_enum" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."location_type_enum" AS ENUM('region', 'country', 'city', 'district', 'site', 'office');--> statement-breakpoint
CREATE TYPE "public"."contract_status_enum" AS ENUM('draft', 'active', 'terminated', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."contract_type_enum" AS ENUM('permanent', 'fixed_term', 'probationary', 'internship', 'service', 'part_time');--> statement-breakpoint
CREATE TYPE "public"."education_level_enum" AS ENUM('primary', 'lower_secondary', 'upper_secondary', 'vocational', 'college', 'bachelor', 'master', 'doctor', 'other');--> statement-breakpoint
CREATE TYPE "public"."employee_status_enum" AS ENUM('working', 'probation', 'terminated', 'leave', 'suspended', 'retired');--> statement-breakpoint
CREATE TYPE "public"."employment_type_enum" AS ENUM('permanent', 'fixed_term', 'probationary', 'internship', 'contractor', 'part_time');--> statement-breakpoint
CREATE TYPE "public"."gender_enum" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."org_assignment_type_enum" AS ENUM('primary', 'secondary', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."position_status_enum" AS ENUM('draft', 'pending_approval', 'open', 'frozen', 'closed');--> statement-breakpoint
CREATE TYPE "public"."attendance_event_source_enum" AS ENUM('DEVICE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."attendance_event_type_enum" AS ENUM('CLOCK_IN', 'CLOCK_OUT');--> statement-breakpoint
CREATE TYPE "public"."attendance_override_reason_enum" AS ENUM('manual_correction', 'policy_exception', 'data_fix', 'reconciliation');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_enum" AS ENUM('morning', 'noon', 'afternoon');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_status_enum" AS ENUM('READY', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_type_enum" AS ENUM('MORNING', 'AFTERNOON', 'LUNCH_DUTY', 'NIGHT', 'OT');--> statement-breakpoint
CREATE TYPE "public"."attendance_summary_status_enum" AS ENUM('present', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'off');--> statement-breakpoint
CREATE TYPE "public"."attendance_type_enum" AS ENUM('check_in', 'check_out', 'break_start', 'break_end', 'note');--> statement-breakpoint
CREATE TYPE "public"."leave_request_status_enum" AS ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_session_enum" AS ENUM('full_day', 'morning', 'afternoon');--> statement-breakpoint
CREATE TYPE "public"."leave_unit_enum" AS ENUM('day', 'hour');--> statement-breakpoint
CREATE TYPE "public"."lunch_duty_type_enum" AS ENUM('indoor', 'outdoor');--> statement-breakpoint
CREATE TYPE "public"."overtime_status_enum" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."punch_verification_status_enum" AS ENUM('verified', 'flagged', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."availability_source_enum" AS ENUM('employee', 'manager');--> statement-breakpoint
CREATE TYPE "public"."schedule_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."schedule_request_type_enum" AS ENUM('MORNING_OFF', 'AFTERNOON_OFF', 'FULL_DAY_OFF');--> statement-breakpoint
CREATE TYPE "public"."shift_assignment_status_enum" AS ENUM('planned', 'published', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."weekday_enum" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."assignee_type_enum" AS ENUM('employee', 'manager', 'hr', 'it', 'specific');--> statement-breakpoint
CREATE TYPE "public"."task_activity_action_enum" AS ENUM('created', 'assigned', 'accepted', 'declined', 'submitted', 'approved', 'returned', 'resubmitted', 'cancelled', 'status_changed', 'progress_updated', 'unassigned');--> statement-breakpoint
CREATE TYPE "public"."task_dependency_type_enum" AS ENUM('blocks', 'related');--> statement-breakpoint
CREATE TYPE "public"."task_domain_event_type_enum" AS ENUM('task.created', 'task.assigned', 'task.unassigned', 'task.accepted', 'task.declined', 'task.started', 'task.submitted', 'task.revision_requested', 'task.completed', 'task.cancelled', 'task.deleted', 'task.comment_added', 'task.attachment_uploaded', 'task.overdue', 'task.due_soon', 'task.approval_overdue', 'task.revision_limit_reached', 'task.bulk_assigned', 'task.reassigned');--> statement-breakpoint
CREATE TYPE "public"."task_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status_enum" AS ENUM('created', 'assigned', 'in_progress', 'declined', 'submitted', 'revision', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pay_frequency_enum" AS ENUM('monthly', 'semi_monthly', 'bi_weekly', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."payroll_item_type_enum" AS ENUM('earning', 'deduction', 'tax', 'insurance', 'employer_contribution', 'overtime', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."payroll_period_status_enum" AS ENUM('draft', 'open', 'processing', 'closed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status_enum" AS ENUM('draft', 'processing', 'approved', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payslip_status_enum" AS ENUM('draft', 'published', 'acknowledged', 'voided');--> statement-breakpoint
CREATE TYPE "public"."statutory_contribution_type_enum" AS ENUM('social_insurance', 'health_insurance', 'unemployment_insurance');--> statement-breakpoint
CREATE TYPE "public"."notification_status_enum" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type_enum" AS ENUM('email', 'sms', 'push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."workflow_instance_status_enum" AS ENUM('active', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_step_status_enum" AS ENUM('pending', 'approved', 'rejected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status_enum" AS ENUM('pending', 'processing', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_subscription_status_enum" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."chat_conversation_type_enum" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TYPE "public"."chat_message_status_enum" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type_enum" AS ENUM('text', 'attachment', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_participant_role_enum" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."violation_severity_enum" AS ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."violation_status_enum" AS ENUM('OPEN', 'RESOLVED', 'WAIVED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"producer_context" text NOT NULL,
	"aggregate_id" uuid,
	"correlation_id" text,
	"causation_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 12 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumer_idempotency" (
	"consumer_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consumer_idempotency_consumer_id_event_id_pk" PRIMARY KEY("consumer_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "request_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"endpoint" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text,
	"status" "request_idempotency_status_enum" DEFAULT 'pending' NOT NULL,
	"response_payload" jsonb,
	"error_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"bucket" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"status" "file_status_enum" DEFAULT 'temp' NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"sha256" text,
	"uploaded_by" uuid,
	"finalized_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"finalize_attempts" integer DEFAULT 0 NOT NULL,
	"last_finalize_at" timestamp with time zone,
	"last_finalize_error" text,
	"thumbnail_key" text,
	"legal_hold_at" timestamp with time zone,
	"retention_days" integer,
	"scan_status" text,
	"scan_result" text,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pending_file_finalizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"target_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" text NOT NULL,
	"span_id" text NOT NULL,
	"parent_span_id" text,
	"name" text NOT NULL,
	"correlation_id" text,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"duration_ms" integer,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_response_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"anomaly_type" text NOT NULL,
	"severity" text NOT NULL,
	"action_type" text NOT NULL,
	"action_payload" jsonb,
	"result" text NOT NULL,
	"error" text,
	"anomaly_snapshot" jsonb,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_response_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anomaly_type" text NOT NULL,
	"min_severity" text DEFAULT 'warning' NOT NULL,
	"action_type" text NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb,
	"cooldown_seconds" integer DEFAULT 300 NOT NULL,
	"max_actions_per_hour" integer DEFAULT 5 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"action" text NOT NULL,
	"permission_code" text,
	"role_id" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_denials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"reason" text NOT NULL,
	"approved_by_user_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"allowed" boolean NOT NULL,
	"policy_used" text,
	"permissions_checked" text[],
	"roles_active" text[],
	"reason" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_hierarchy" (
	"parent_permission" text NOT NULL,
	"child_permission" text NOT NULL,
	CONSTRAINT "pk_permission_hierarchy" PRIMARY KEY("parent_permission","child_permission")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"client_ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_role_permissions" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code"),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"user_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"expires_at" timestamp with time zone,
	CONSTRAINT "pk_user_permissions" PRIMARY KEY("user_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	CONSTRAINT "pk_user_roles" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text,
	"password_reset_token_hash" text,
	"password_reset_token_expires_at" timestamp with time zone,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"parent_branch_id" uuid,
	"address" text,
	"phone_number" text,
	"email" text,
	"is_headquarters" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_branches_company_code" UNIQUE("company_id","code")
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"head_position_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "business_units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_code" text,
	"registration_number" text,
	"currency" text DEFAULT 'VND' NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"status" "company_status_enum" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"budget_owner_position_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"cost_center_code" text,
	"business_unit_id" uuid,
	"default_cost_center_id" uuid,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"parent_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "location_type_enum" NOT NULL,
	"address" text,
	"timezone" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"radius_meters" integer,
	"allowed_ip_cidrs" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_locations_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"file_id" uuid,
	"issued_by" text NOT NULL,
	"issued_date" date NOT NULL,
	"expired_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_compensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"job_assignment_id" uuid,
	"pay_type" varchar(50) NOT NULL,
	"base_amount" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"pay_frequency" "pay_frequency_enum",
	"effective_start_date" date NOT NULL,
	"effective_end_date" date,
	"change_reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_record_id" uuid,
	"contract_number" text,
	"contract_type" "contract_type_enum" DEFAULT 'permanent' NOT NULL,
	"status" "contract_status_enum" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"signed_at" date,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"file_url" text,
	"note" text,
	"previous_contract_id" uuid,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_employee_contracts_employee_version" UNIQUE("employee_id","version"),
	CONSTRAINT "chk_employee_contracts_date_range" CHECK ("employee_contracts"."effective_to" is null or "employee_contracts"."effective_from" <= "employee_contracts"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_educations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"education_level" "education_level_enum" NOT NULL,
	"education_name" text,
	"major" text,
	"institution" text,
	"graduation_year" integer,
	"gpa" numeric(4, 2),
	"document_id" uuid,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_equipment_handover_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handover_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"serial_number" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"note" text,
	"document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_employee_equipment_handover_items_quantity_positive" CHECK ("employee_equipment_handover_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "employee_equipment_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"document_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"handed_over_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(255) NOT NULL,
	"issuing_country" varchar(2),
	"issued_date" date,
	"expiry_date" date,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" "employee_status_enum" NOT NULL,
	"notes" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"employee_code" text NOT NULL,
	"avatar_file_id" uuid,
	"dob" date,
	"gender" "gender_enum" DEFAULT 'unknown',
	"parent_branch_id" uuid,
	"address" text,
	"phone_number" text,
	"personal_email" text,
	"work_email" text,
	"branch_id" uuid,
	"location_id" uuid,
	"current_employment_record_id" uuid,
	"current_org_assignment_id" uuid,
	"current_salary_structure_id" uuid,
	"department_id" uuid,
	"start_date" date,
	"end_date" date,
	"last_working_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "employee_status_enum" DEFAULT 'working' NOT NULL,
	"probation_end_date" date,
	"identity_number" text,
	"identity_date" date,
	"identity_place" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"bank_account_number" text,
	"bank_name" text,
	"tax_code" text,
	"highest_education_level" "education_level_enum",
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "uq_employees_user_id" UNIQUE("user_id"),
	CONSTRAINT "chk_employees_date_range" CHECK ("employees"."end_date" is null or "employees"."start_date" is null or "employees"."start_date" <= "employees"."end_date")
);
--> statement-breakpoint
CREATE TABLE "employment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"manager_employee_id" uuid,
	"note" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_employment_records_date_range" CHECK ("employment_records"."end_date" is null or "employment_records"."start_date" <= "employment_records"."end_date")
);
--> statement-breakpoint
CREATE TABLE "job_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_primary" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id" uuid,
	"job_title" text,
	"assignment_type" "org_assignment_type_enum" DEFAULT 'primary' NOT NULL,
	"manager_employee_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_org_assignments_date_range" CHECK ("org_assignments"."effective_to" is null or "org_assignments"."effective_from" <= "org_assignments"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "positions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "attendance_daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_shift_assignment_id" uuid,
	"leave_request_id" uuid,
	"work_date" date NOT NULL,
	"status" "attendance_summary_status_enum" DEFAULT 'present' NOT NULL,
	"scheduled_minutes" integer DEFAULT 0 NOT NULL,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"early_leave_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"is_holiday" boolean DEFAULT false NOT NULL,
	"anomaly_flags" jsonb,
	"source_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_daily_summaries_employee_date" UNIQUE("employee_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "attendance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "attendance_event_type_enum" NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"source" "attendance_event_source_enum" DEFAULT 'DEVICE' NOT NULL,
	"location_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "attendance_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_daily_summary_id" uuid,
	"work_date" date NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"related_event_ids" jsonb,
	"resolution_note" text,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_exceptions_employee_date_type" UNIQUE("employee_id","work_date","type")
);
--> statement-breakpoint
CREATE TABLE "attendance_overtime_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"candidate_minutes" integer DEFAULT 0 NOT NULL,
	"requested_minutes" integer NOT NULL,
	"approved_minutes" integer DEFAULT 0 NOT NULL,
	"status" "overtime_status_enum" DEFAULT 'pending' NOT NULL,
	"request_note" text,
	"rejection_reason" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_ot_employee_date" UNIQUE("employee_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"assignment_id" text,
	"session_type" "attendance_session_type_enum" NOT NULL,
	"status" "attendance_session_status_enum" DEFAULT 'READY' NOT NULL,
	"date" date NOT NULL,
	"planned_start" text,
	"planned_end" text,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_summary_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"reason" "attendance_override_reason_enum" NOT NULL,
	"note" text,
	"overridden_status" "attendance_summary_status_enum",
	"overridden_worked_minutes" integer,
	"overridden_late_minutes" integer,
	"overridden_early_leave_minutes" integer,
	"overridden_overtime_minutes" integer,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_summary_overrides_employee_date" UNIQUE("employee_id","work_date")
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"session_id" uuid,
	"type" "attendance_type_enum" NOT NULL,
	"time" timestamp with time zone NOT NULL,
	"date" date NOT NULL,
	"session" "attendance_session_enum",
	"image" text,
	"location" text,
	"location_id" uuid,
	"note" text,
	"lunch_duty_type" "lunch_duty_type_enum",
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"distance_meters" integer,
	"ip_address" text,
	"selfie_s3_key" text,
	"verification_status" "punch_verification_status_enum",
	"flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendances_employee_date_session_type" UNIQUE("employee_id","date","session","type")
);
--> statement-breakpoint
CREATE TABLE "gps_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"balance_year" integer NOT NULL,
	"opening_balance" numeric(8, 2) DEFAULT '0' NOT NULL,
	"accrued_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"used_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carried_over_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"adjusted_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_leave_balances_employee_type_year" UNIQUE("employee_id","leave_type_id","balance_year")
);
--> statement-breakpoint
CREATE TABLE "leave_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_leave_policies_company_code" UNIQUE("code"),
	CONSTRAINT "chk_leave_policies_date_range" CHECK ("leave_policies"."effective_to" is null or "leave_policies"."effective_from" <= "leave_policies"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "leave_policy_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_leave_policy_assignments_date_range" CHECK ("leave_policy_assignments"."effective_to" is null or "leave_policy_assignments"."effective_from" <= "leave_policy_assignments"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"approver_user_id" uuid,
	"status" "leave_request_status_enum" DEFAULT 'pending' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_session" "leave_session_enum" DEFAULT 'full_day' NOT NULL,
	"end_session" "leave_session_enum" DEFAULT 'full_day' NOT NULL,
	"total_units" numeric(8, 2) NOT NULL,
	"reason" text,
	"note" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_leave_requests_date_range" CHECK ("leave_requests"."start_date" <= "leave_requests"."end_date")
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" "leave_unit_enum" DEFAULT 'day' NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"max_days_per_year" numeric(8, 2),
	"min_notice_hours" integer,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_leave_types_company_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "schedules_new" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"locked_at" timestamp with time zone,
	"locked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_new_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "employee_qualifications" (
	"employee_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_employee_qualifications" UNIQUE("employee_id","position_id")
);
--> statement-breakpoint
CREATE TABLE "employee_shift_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_template_id" uuid,
	"position_id" uuid,
	"location_id" uuid,
	"schedule_id" uuid,
	"assignment_date" date NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" "shift_assignment_status_enum" DEFAULT 'planned' NOT NULL,
	"note" text,
	"snapshot_shift_name" text,
	"snapshot_start_time" time,
	"snapshot_end_time" time,
	"snapshot_break_minutes" integer,
	"snapshot_location_name" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_employee_shift_assignments_employee_date" UNIQUE("employee_id","assignment_date")
);
--> statement-breakpoint
CREATE TABLE "holiday_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_holiday_calendars_company_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holiday_calendar_id" uuid NOT NULL,
	"name" text NOT NULL,
	"holiday_date" date NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_holidays_calendar_date" UNIQUE("holiday_calendar_id","holiday_date")
);
--> statement-breakpoint
CREATE TABLE "schedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"request_type" "schedule_request_type_enum" NOT NULL,
	"reason" text,
	"status" "schedule_request_status_enum" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"location_id" uuid,
	"work_role_id" uuid,
	"shift_template_id" uuid,
	"required_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_schedule_requirement_slot" UNIQUE("schedule_id","location_id","work_role_id","shift_template_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_roster_lifecycle_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roster_publication_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_roster_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"department_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejected_by_user_id" uuid,
	"rejection_reason" text,
	"published_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"locked_at" timestamp with time zone,
	"locked_by_user_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_shift_roster_publications_period" UNIQUE("branch_id","department_id","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "shift_roster_version_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roster_publication_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "uq_shift_roster_version_snapshots_roster_version" UNIQUE("roster_publication_id","version")
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"location_id" uuid,
	"holiday_calendar_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"tolerance_minutes" integer DEFAULT 0 NOT NULL,
	"work_days" jsonb,
	"is_night_shift" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_shift_templates_company_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "work_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" "weekday_enum" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"note" text,
	CONSTRAINT "chk_work_blocks_time_range" CHECK ("work_blocks"."start_time" < "work_blocks"."end_time")
);
--> statement-breakpoint
CREATE TABLE "work_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "task_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" "task_activity_action_enum" NOT NULL,
	"from_status" "task_status_enum",
	"to_status" "task_status_enum",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"employee_id" uuid,
	"assigned_by_user_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"file_name" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text,
	"size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"author_user_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegator_user_id" uuid NOT NULL,
	"delegatee_user_id" uuid NOT NULL,
	"department_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	"type" "task_dependency_type_enum" DEFAULT 'blocks' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_task_deps" UNIQUE("task_id","depends_on_task_id")
);
--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_sequence" bigserial NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" "task_domain_event_type_enum" NOT NULL,
	"actor_user_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" uuid,
	"causation_id" uuid,
	"sequence" integer DEFAULT 0 NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"cron_expression" text NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_created_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_sla_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"priority" "task_priority_enum" NOT NULL,
	"max_duration_minutes" integer NOT NULL,
	"notify_before_minutes" integer,
	"approval_latency_minutes" integer,
	"max_revision_count" integer,
	"escalate_to_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_sla_rules_priority_unique" UNIQUE("priority")
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"submitted_by_user_id" uuid,
	"version" integer NOT NULL,
	"result_text" text,
	"checklist" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_task_submissions_task_version" UNIQUE("task_id","version")
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"checklist" jsonb,
	"priority" "task_priority_enum" DEFAULT 'medium' NOT NULL,
	"default_assignee_id" uuid,
	"department_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status_enum" DEFAULT 'created' NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"result_text" text,
	"checklist" text,
	"assignee_id" uuid,
	"created_by_user_id" uuid,
	"template_id" uuid,
	"parent_task_id" uuid,
	"priority" "task_priority_enum" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rejection_reason" text,
	"revision_reason" text,
	"cancellation_reason" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"last_reminder_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"payslip_id" uuid,
	"type" "payroll_item_type_enum" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"quantity" numeric(10, 2),
	"rate" numeric(10, 2),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"pay_date" date,
	"status" "payroll_period_status_enum" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payroll_periods_company_code" UNIQUE("code"),
	CONSTRAINT "chk_payroll_periods_date_range" CHECK ("payroll_periods"."starts_on" <= "payroll_periods"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_period_id" uuid NOT NULL,
	"branch_id" uuid,
	"status" "payroll_run_status_enum" DEFAULT 'draft' NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payroll_runs_period_branch" UNIQUE("payroll_period_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"salary" numeric(14, 2) NOT NULL,
	"bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"deduction" numeric(14, 2) DEFAULT '0' NOT NULL,
	"allowance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"insurance_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_salary" numeric(14, 2),
	"currency" text DEFAULT 'VND' NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"payroll_period_id" uuid,
	"payroll_run_id" uuid,
	"payslip_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payrolls_date_range" CHECK ("payrolls"."effective_to" is null or "payrolls"."effective_from" is null or "payrolls"."effective_from" <= "payrolls"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gross_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"status" "payslip_status_enum" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payslips_payroll_run_employee" UNIQUE("payroll_run_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"pay_frequency" "pay_frequency_enum" DEFAULT 'monthly' NOT NULL,
	"base_salary" numeric(14, 2) NOT NULL,
	"components" jsonb,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_salary_structures_date_range" CHECK ("salary_structures"."effective_to" is null or "salary_structures"."effective_from" <= "salary_structures"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "statutory_contribution_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_type" "statutory_contribution_type_enum" NOT NULL,
	"employment_type" "employment_type_enum",
	"employee_rate" numeric(5, 4) NOT NULL,
	"employer_rate" numeric(5, 4) NOT NULL,
	"salary_cap" numeric(14, 2),
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_statutory_rules_employee_rate" CHECK ("statutory_contribution_rules"."employee_rate" >= 0 and "statutory_contribution_rules"."employee_rate" <= 1),
	CONSTRAINT "chk_statutory_rules_employer_rate" CHECK ("statutory_contribution_rules"."employer_rate" >= 0 and "statutory_contribution_rules"."employer_rate" <= 1),
	CONSTRAINT "chk_statutory_rules_salary_cap" CHECK ("statutory_contribution_rules"."salary_cap" is null or "statutory_contribution_rules"."salary_cap" >= 0),
	CONSTRAINT "chk_statutory_rules_effective_range" CHECK ("statutory_contribution_rules"."effective_to" is null or "statutory_contribution_rules"."effective_from" <= "statutory_contribution_rules"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "tax_brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"bracket_order" integer NOT NULL,
	"min_income" numeric(14, 2) NOT NULL,
	"max_income" numeric(14, 2),
	"rate" numeric(5, 4) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tax_brackets_company_order_from" UNIQUE("bracket_order","effective_from"),
	CONSTRAINT "chk_tax_brackets_rate" CHECK ("tax_brackets"."rate" >= 0 and "tax_brackets"."rate" <= 1),
	CONSTRAINT "chk_tax_brackets_min_income" CHECK ("tax_brackets"."min_income" >= 0),
	CONSTRAINT "chk_tax_brackets_income_range" CHECK ("tax_brackets"."max_income" is null or "tax_brackets"."max_income" >= "tax_brackets"."min_income"),
	CONSTRAINT "chk_tax_brackets_effective_range" CHECK ("tax_brackets"."effective_to" is null or "tax_brackets"."effective_from" <= "tax_brackets"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "attendance_monthly_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_worked_minutes" integer DEFAULT 0 NOT NULL,
	"total_scheduled_minutes" integer DEFAULT 0 NOT NULL,
	"total_late_count" integer DEFAULT 0 NOT NULL,
	"total_absent_days" integer DEFAULT 0 NOT NULL,
	"total_leave_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"total_overtime_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_monthly_aggregates_employee_month" UNIQUE("employee_id","year","month"),
	CONSTRAINT "chk_attendance_monthly_aggregates_month" CHECK ("attendance_monthly_aggregates"."month" >= 1 and "attendance_monthly_aggregates"."month" <= 12),
	CONSTRAINT "chk_attendance_monthly_aggregates_worked_non_negative" CHECK ("attendance_monthly_aggregates"."total_worked_minutes" >= 0),
	CONSTRAINT "chk_attendance_monthly_aggregates_scheduled_non_negative" CHECK ("attendance_monthly_aggregates"."total_scheduled_minutes" >= 0),
	CONSTRAINT "chk_attendance_monthly_aggregates_late_non_negative" CHECK ("attendance_monthly_aggregates"."total_late_count" >= 0),
	CONSTRAINT "chk_attendance_monthly_aggregates_absent_non_negative" CHECK ("attendance_monthly_aggregates"."total_absent_days" >= 0),
	CONSTRAINT "chk_attendance_monthly_aggregates_leave_non_negative" CHECK ("attendance_monthly_aggregates"."total_leave_days" >= 0),
	CONSTRAINT "chk_attendance_monthly_aggregates_overtime_non_negative" CHECK ("attendance_monthly_aggregates"."total_overtime_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "headcount_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"branch_id" uuid,
	"department_id" uuid,
	"employment_status" "employee_status_enum" NOT NULL,
	"employment_type" "employment_type_enum" NOT NULL,
	"headcount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_headcount_snapshots_headcount" CHECK ("headcount_snapshots"."headcount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payroll_cost_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_period_id" uuid NOT NULL,
	"branch_id" uuid,
	"department_id" uuid,
	"employment_type" "employment_type_enum",
	"total_gross" numeric(14, 2) NOT NULL,
	"total_net" numeric(14, 2) NOT NULL,
	"total_employer_contributions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"employee_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payroll_cost_summaries_employee_count" CHECK ("payroll_cost_summaries"."employee_count" >= 0),
	CONSTRAINT "chk_payroll_cost_summaries_total_gross_non_negative" CHECK ("payroll_cost_summaries"."total_gross" >= 0),
	CONSTRAINT "chk_payroll_cost_summaries_total_net_non_negative" CHECK ("payroll_cost_summaries"."total_net" >= 0),
	CONSTRAINT "chk_payroll_cost_summaries_employer_contrib_non_negative" CHECK ("payroll_cost_summaries"."total_employer_contributions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "notification_type_enum" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"type" "notification_type_enum" NOT NULL,
	"status" "notification_status_enum" DEFAULT 'pending' NOT NULL,
	"subject" text,
	"body" text,
	"metadata" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text,
	"initial_state" text NOT NULL,
	"states" jsonb NOT NULL,
	"transitions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_workflow_definitions_key_version" UNIQUE("key","version")
);
--> statement-breakpoint
CREATE TABLE "workflow_instance_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"transition" text NOT NULL,
	"actor_user_id" uuid,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"current_state" text NOT NULL,
	"status" "workflow_instance_status_enum" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text,
	"description" text,
	"steps" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_approval_policies_key_version" UNIQUE("key","version")
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"status" "approval_request_status_enum" DEFAULT 'pending' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"requested_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"status" "approval_step_status_enum" DEFAULT 'pending' NOT NULL,
	"approver_user_id" uuid,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"comment" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_approval_steps_request_step" UNIQUE("request_id","step_index")
);
--> statement-breakpoint
CREATE TABLE "leave_approval_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_request_id" uuid NOT NULL,
	"approval_request_id" uuid NOT NULL,
	"policy_id" uuid,
	"status" "approval_request_status_enum" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_approval_links_leave_request_id_unique" UNIQUE("leave_request_id"),
	CONSTRAINT "leave_approval_links_approval_request_id_unique" UNIQUE("approval_request_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"status" "webhook_delivery_status_enum" DEFAULT 'pending' NOT NULL,
	"request_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"target_url" text NOT NULL,
	"secret" text NOT NULL,
	"status" "webhook_subscription_status_enum" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "chat_conversation_type_enum" NOT NULL,
	"name" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_message_id" uuid,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_chat_message_reads_conv_user" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"type" "chat_message_type_enum" DEFAULT 'text' NOT NULL,
	"content" text,
	"attachments" jsonb,
	"status" "chat_message_status_enum" DEFAULT 'sent' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "chat_participant_role_enum" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_chat_participants_conv_user" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "system_health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" text NOT NULL,
	"status" text NOT NULL,
	"latency_ms" integer,
	"error" text,
	"details" jsonb,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"code" text NOT NULL,
	"severity" "violation_severity_enum" NOT NULL,
	"status" "violation_status_enum" DEFAULT 'OPEN' NOT NULL,
	"auto_resolvable" boolean DEFAULT false NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_file_finalizations" ADD CONSTRAINT "pending_file_finalizations_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_denials" ADD CONSTRAINT "access_denials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_denials" ADD CONSTRAINT "access_denials_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_denials" ADD CONSTRAINT "access_denials_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_audit_log" ADD CONSTRAINT "authorization_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_hierarchy" ADD CONSTRAINT "permission_hierarchy_parent_permission_permissions_code_fk" FOREIGN KEY ("parent_permission") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_hierarchy" ADD CONSTRAINT "permission_hierarchy_child_permission_permissions_code_fk" FOREIGN KEY ("child_permission") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_departments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_job_assignment_id_job_assignments_id_fk" FOREIGN KEY ("job_assignment_id") REFERENCES "public"."job_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employment_record_id_employment_records_id_fk" FOREIGN KEY ("employment_record_id") REFERENCES "public"."employment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_educations" ADD CONSTRAINT "employee_educations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_educations" ADD CONSTRAINT "employee_educations_document_id_files_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_equipment_handover_items" ADD CONSTRAINT "employee_equipment_handover_items_handover_id_employee_equipment_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."employee_equipment_handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_equipment_handover_items" ADD CONSTRAINT "employee_equipment_handover_items_document_id_files_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_equipment_handovers" ADD CONSTRAINT "employee_equipment_handovers_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_equipment_handovers" ADD CONSTRAINT "employee_equipment_handovers_document_id_files_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_identifiers" ADD CONSTRAINT "employee_identifiers_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_current_employment_record_id_employment_records_id_fk" FOREIGN KEY ("current_employment_record_id") REFERENCES "public"."employment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_current_org_assignment_id_org_assignments_id_fk" FOREIGN KEY ("current_org_assignment_id") REFERENCES "public"."org_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_current_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("current_salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_records" ADD CONSTRAINT "employment_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_records" ADD CONSTRAINT "employment_records_manager_employee_id_employees_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_assignments" ADD CONSTRAINT "org_assignments_manager_employee_id_employees_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_attendance_daily_summary_id_attendance_daily_summaries_id_fk" FOREIGN KEY ("attendance_daily_summary_id") REFERENCES "public"."attendance_daily_summaries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_overtime_requests" ADD CONSTRAINT "attendance_overtime_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_overtime_requests" ADD CONSTRAINT "attendance_overtime_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summary_overrides" ADD CONSTRAINT "attendance_summary_overrides_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summary_overrides" ADD CONSTRAINT "attendance_summary_overrides_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_logs" ADD CONSTRAINT "gps_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_policy_id_leave_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."leave_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_policy_id_leave_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."leave_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules_new" ADD CONSTRAINT "schedules_new_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules_new" ADD CONSTRAINT "schedules_new_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_position_id_work_roles_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."work_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_shift_template_id_shift_templates_id_fk" FOREIGN KEY ("shift_template_id") REFERENCES "public"."shift_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_position_id_work_roles_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."work_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_schedule_id_schedules_new_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules_new"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_holiday_calendar_id_holiday_calendars_id_fk" FOREIGN KEY ("holiday_calendar_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requirements" ADD CONSTRAINT "schedule_requirements_schedule_id_schedules_new_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requirements" ADD CONSTRAINT "schedule_requirements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requirements" ADD CONSTRAINT "schedule_requirements_work_role_id_work_roles_id_fk" FOREIGN KEY ("work_role_id") REFERENCES "public"."work_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_requirements" ADD CONSTRAINT "schedule_requirements_shift_template_id_shift_templates_id_fk" FOREIGN KEY ("shift_template_id") REFERENCES "public"."shift_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_lifecycle_history" ADD CONSTRAINT "shift_roster_lifecycle_history_roster_publication_id_shift_roster_publications_id_fk" FOREIGN KEY ("roster_publication_id") REFERENCES "public"."shift_roster_publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_lifecycle_history" ADD CONSTRAINT "shift_roster_lifecycle_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_publications" ADD CONSTRAINT "shift_roster_publications_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_version_snapshots" ADD CONSTRAINT "shift_roster_version_snapshots_roster_publication_id_shift_roster_publications_id_fk" FOREIGN KEY ("roster_publication_id") REFERENCES "public"."shift_roster_publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_roster_version_snapshots" ADD CONSTRAINT "shift_roster_version_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_holiday_calendar_id_holiday_calendars_id_fk" FOREIGN KEY ("holiday_calendar_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_blocks" ADD CONSTRAINT "work_blocks_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_delegator_user_id_users_id_fk" FOREIGN KEY ("delegator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_delegatee_user_id_users_id_fk" FOREIGN KEY ("delegatee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_aggregate_id_tasks_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_last_created_task_id_tasks_id_fk" FOREIGN KEY ("last_created_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sla_rules" ADD CONSTRAINT "task_sla_rules_escalate_to_user_id_users_id_fk" FOREIGN KEY ("escalate_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_default_assignee_id_employees_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_employees_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_monthly_aggregates" ADD CONSTRAINT "attendance_monthly_aggregates_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "headcount_snapshots" ADD CONSTRAINT "headcount_snapshots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "headcount_snapshots" ADD CONSTRAINT "headcount_snapshots_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_cost_summaries" ADD CONSTRAINT "payroll_cost_summaries_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_cost_summaries" ADD CONSTRAINT "payroll_cost_summaries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_cost_summaries" ADD CONSTRAINT "payroll_cost_summaries_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_transitions" ADD CONSTRAINT "workflow_instance_transitions_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instance_transitions" ADD CONSTRAINT "workflow_instance_transitions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_policy_id_approval_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_request_id_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approval_links" ADD CONSTRAINT "leave_approval_links_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approval_links" ADD CONSTRAINT "leave_approval_links_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approval_links" ADD CONSTRAINT "leave_approval_links_policy_id_approval_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_last_read_message_id_chat_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_violations" ADD CONSTRAINT "attendance_violations_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_violations" ADD CONSTRAINT "attendance_violations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor_user_id" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_event_outbox_event_type" ON "event_outbox" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_event_outbox_published_at" ON "event_outbox" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_event_outbox_dispatcher" ON "event_outbox" USING btree ("published_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_consumer_idempotency_event_id" ON "consumer_idempotency" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_request_idempotency_actor_endpoint_key" ON "request_idempotency" USING btree ("actor_user_id","endpoint","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_request_idempotency_status" ON "request_idempotency" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_files_key" ON "files" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_files_owner" ON "files" USING btree ("owner_type","owner_id","status");--> statement-breakpoint
CREATE INDEX "idx_files_status_expires" ON "files" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_files_sha256_dedup" ON "files" USING btree ("sha256","owner_id","purpose","status");--> statement-breakpoint
CREATE INDEX "idx_pff_next_retry" ON "pending_file_finalizations" USING btree ("next_retry_at","attempts");--> statement-breakpoint
CREATE INDEX "idx_pff_file_id" ON "pending_file_finalizations" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_trace_logs_trace_id" ON "trace_logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_trace_logs_name" ON "trace_logs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_trace_logs_created_at" ON "trace_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_auto_response_audit_rule_id" ON "auto_response_audit_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_auto_response_audit_executed_at" ON "auto_response_audit_log" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_auto_response_rules_anomaly_type" ON "auto_response_rules" USING btree ("anomaly_type");--> statement-breakpoint
CREATE INDEX "idx_auto_response_rules_enabled" ON "auto_response_rules" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_access_audit_logs_actor_user_id" ON "access_audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_access_audit_logs_target_user_id" ON "access_audit_logs" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_access_audit_logs_action" ON "access_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_access_audit_logs_created_at" ON "access_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_access_denials_user_id" ON "access_denials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_denials_permission_code" ON "access_denials" USING btree ("permission_code");--> statement-breakpoint
CREATE INDEX "idx_access_grants_user_id" ON "access_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_grants_permission_code" ON "access_grants" USING btree ("permission_code");--> statement-breakpoint
CREATE INDEX "idx_access_grants_expires_at" ON "access_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_user_id" ON "authorization_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_created_at" ON "authorization_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_action" ON "authorization_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_allowed" ON "authorization_audit_log" USING btree ("allowed");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_resource_id" ON "authorization_audit_log" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_authz_audit_request_id" ON "authorization_audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_perm_hierarchy_parent" ON "permission_hierarchy" USING btree ("parent_permission");--> statement-breakpoint
CREATE INDEX "idx_perm_hierarchy_child" ON "permission_hierarchy" USING btree ("child_permission");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user_id" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_permission_code" ON "user_permissions" USING btree ("permission_code");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role_id" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_granted_by" ON "user_roles" USING btree ("granted_by");--> statement-breakpoint
CREATE INDEX "idx_branches_company_id" ON "branches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_branches_parent_id" ON "branches" USING btree ("parent_branch_id");--> statement-breakpoint
CREATE INDEX "idx_business_units_head_position_id" ON "business_units" USING btree ("head_position_id");--> statement-breakpoint
CREATE INDEX "idx_companies_status" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_budget_owner_position_id" ON "cost_centers" USING btree ("budget_owner_position_id");--> statement-breakpoint
CREATE INDEX "idx_departments_branch_id" ON "departments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_departments_parent_id" ON "departments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_company_code" ON "departments" USING btree ("code") WHERE "departments"."code" is not null;--> statement-breakpoint
CREATE INDEX "idx_locations_branch_id" ON "locations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_locations_parent_id" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_locations_type" ON "locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_certifications_employee_id" ON "certifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_certifications_file_id" ON "certifications" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_employee_compensations_employee_id" ON "employee_compensations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_compensations_job_assignment_id" ON "employee_compensations" USING btree ("job_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_employee_contracts_employee_id" ON "employee_contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_contracts_employment_record_id" ON "employee_contracts" USING btree ("employment_record_id");--> statement-breakpoint
CREATE INDEX "idx_employee_contracts_is_current" ON "employee_contracts" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employee_contracts_current_employee" ON "employee_contracts" USING btree ("employee_id") WHERE "employee_contracts"."is_current" = true;--> statement-breakpoint
CREATE INDEX "idx_employee_documents_employee_id" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_documents_file_id" ON "employee_documents" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_employee_documents_document_active" ON "employee_documents" USING btree ("employee_id","document_type","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employee_documents_active_type" ON "employee_documents" USING btree ("employee_id","document_type") WHERE "employee_documents"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_employee_educations_employee_id" ON "employee_educations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_educations_institution" ON "employee_educations" USING btree ("institution");--> statement-breakpoint
CREATE INDEX "idx_employee_educations_level" ON "employee_educations" USING btree ("education_level");--> statement-breakpoint
CREATE INDEX "idx_employee_equipment_handover_items_handover_id" ON "employee_equipment_handover_items" USING btree ("handover_id");--> statement-breakpoint
CREATE INDEX "idx_employee_equipment_handover_items_document_id" ON "employee_equipment_handover_items" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_equipment_handovers_employee_id" ON "employee_equipment_handovers" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_equipment_handovers_document_id" ON "employee_equipment_handovers" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_employee_equipment_handovers_handed_over_at" ON "employee_equipment_handovers" USING btree ("handed_over_at");--> statement-breakpoint
CREATE INDEX "idx_employee_identifiers_employee_id" ON "employee_identifiers" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_identifiers_value" ON "employee_identifiers" USING btree ("identifier_value");--> statement-breakpoint
CREATE INDEX "idx_employee_status_history_employee_id" ON "employee_status_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_status_history_changed_by" ON "employee_status_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "idx_employees_user_id" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_employees_department_id" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_employees_branch_id" ON "employees" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_employees_location_id" ON "employees" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_employees_current_employment_record_id" ON "employees" USING btree ("current_employment_record_id");--> statement-breakpoint
CREATE INDEX "idx_employees_current_org_assignment_id" ON "employees" USING btree ("current_org_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_employees_current_salary_structure_id" ON "employees" USING btree ("current_salary_structure_id");--> statement-breakpoint
CREATE INDEX "idx_employees_employee_code" ON "employees" USING btree ("employee_code");--> statement-breakpoint
CREATE INDEX "idx_employees_name" ON "employees" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "idx_employees_identity_number" ON "employees" USING btree ("identity_number");--> statement-breakpoint
CREATE INDEX "idx_employees_deleted_at" ON "employees" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employees_work_email" ON "employees" USING btree ("work_email") WHERE "employees"."work_email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employees_personal_email" ON "employees" USING btree ("personal_email") WHERE "employees"."personal_email" is not null;--> statement-breakpoint
CREATE INDEX "idx_employment_records_employee_id" ON "employment_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employment_records_manager_employee_id" ON "employment_records" USING btree ("manager_employee_id");--> statement-breakpoint
CREATE INDEX "idx_employment_records_is_current" ON "employment_records" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employment_records_current_employee" ON "employment_records" USING btree ("employee_id") WHERE "employment_records"."is_current" = true;--> statement-breakpoint
CREATE INDEX "idx_job_assignments_employee_id" ON "job_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_position_id" ON "job_assignments" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_org_assignments_employee_id" ON "org_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_org_assignments_department_id" ON "org_assignments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_org_assignments_manager_employee_id" ON "org_assignments" USING btree ("manager_employee_id");--> statement-breakpoint
CREATE INDEX "idx_org_assignments_is_current" ON "org_assignments" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_assignments_current_employee" ON "org_assignments" USING btree ("employee_id") WHERE "org_assignments"."is_current" = true and "org_assignments"."assignment_type" = 'primary';--> statement-breakpoint
CREATE INDEX "idx_positions_name" ON "positions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_attendance_daily_summaries_employee_id" ON "attendance_daily_summaries" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_daily_summaries_shift_assignment_id" ON "attendance_daily_summaries" USING btree ("employee_shift_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_daily_summaries_leave_request_id" ON "attendance_daily_summaries" USING btree ("leave_request_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_daily_summaries_employee_shift" ON "attendance_daily_summaries" USING btree ("employee_id","employee_shift_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_events_employee_id" ON "attendance_events" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_events_timestamp" ON "attendance_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_attendance_events_employee_date" ON "attendance_events" USING btree ("employee_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_attendance_exceptions_employee_id" ON "attendance_exceptions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_exceptions_work_date" ON "attendance_exceptions" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "idx_attendance_exceptions_status" ON "attendance_exceptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_attendance_exceptions_summary_id" ON "attendance_exceptions" USING btree ("attendance_daily_summary_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_exceptions_resolved_by" ON "attendance_exceptions" USING btree ("resolved_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_ot_employee_id" ON "attendance_overtime_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_ot_work_date" ON "attendance_overtime_requests" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "idx_attendance_ot_status" ON "attendance_overtime_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_attendance_ot_approved_by" ON "attendance_overtime_requests" USING btree ("approved_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_sessions_employee" ON "attendance_sessions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_sessions_date" ON "attendance_sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_attendance_sessions_status" ON "attendance_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_attendance_sessions_employee_date" ON "attendance_sessions" USING btree ("employee_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_active_session" ON "attendance_sessions" USING btree ("employee_id") WHERE status = 'IN_PROGRESS';--> statement-breakpoint
CREATE INDEX "idx_attendance_summary_overrides_employee_id" ON "attendance_summary_overrides" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_summary_overrides_work_date" ON "attendance_summary_overrides" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "idx_attendance_summary_overrides_employee_date" ON "attendance_summary_overrides" USING btree ("employee_id","work_date");--> statement-breakpoint
CREATE INDEX "idx_attendances_employee_id" ON "attendances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendances_date" ON "attendances" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_attendances_employee_date" ON "attendances" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "idx_attendances_employee_time" ON "attendances" USING btree ("employee_id","time");--> statement-breakpoint
CREATE INDEX "idx_attendances_type" ON "attendances" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_attendances_session" ON "attendances" USING btree ("session");--> statement-breakpoint
CREATE INDEX "idx_attendances_location_id" ON "attendances" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_attendances_verification_status" ON "attendances" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_gps_logs_employee_id" ON "gps_logs" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_gps_logs_timestamp" ON "gps_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_leave_balances_employee_id" ON "leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_leave_balances_leave_type_id" ON "leave_balances" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "idx_leave_policies_branch_id" ON "leave_policies" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_leave_policy_assignments_policy_id" ON "leave_policy_assignments" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_leave_policy_assignments_employee_id" ON "leave_policy_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_leave_policy_assignments_current_employee" ON "leave_policy_assignments" USING btree ("employee_id") WHERE "leave_policy_assignments"."effective_to" is null;--> statement-breakpoint
CREATE INDEX "idx_leave_requests_employee_id" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_leave_type_id" ON "leave_requests" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_approver_user_id" ON "leave_requests" USING btree ("approver_user_id");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_status" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leave_types_policy_id" ON "leave_types" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_date" ON "schedules_new" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_schedules_status" ON "schedules_new" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_employee_qualifications_employee_id" ON "employee_qualifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_qualifications_position_id" ON "employee_qualifications" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_employee_shift_assignments_employee_id" ON "employee_shift_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_shift_assignments_shift_template_id" ON "employee_shift_assignments" USING btree ("shift_template_id");--> statement-breakpoint
CREATE INDEX "idx_employee_shift_assignments_location_id" ON "employee_shift_assignments" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_employee_shift_assignments_assignment_date" ON "employee_shift_assignments" USING btree ("assignment_date");--> statement-breakpoint
CREATE INDEX "idx_holiday_calendars_branch_id" ON "holiday_calendars" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_holidays_holiday_calendar_id" ON "holidays" USING btree ("holiday_calendar_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_requests_employee_id" ON "schedule_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_requests_status" ON "schedule_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_schedule_requests_date" ON "schedule_requests" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_req_schedule" ON "schedule_requirements" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_req_location" ON "schedule_requirements" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_req_work_role" ON "schedule_requirements" USING btree ("work_role_id");--> statement-breakpoint
CREATE INDEX "idx_req_shift" ON "schedule_requirements" USING btree ("shift_template_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_employee_id" ON "schedules" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_shift_roster_lifecycle_history_publication_id" ON "shift_roster_lifecycle_history" USING btree ("roster_publication_id");--> statement-breakpoint
CREATE INDEX "idx_shift_roster_publications_status" ON "shift_roster_publications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_shift_roster_publications_period" ON "shift_roster_publications" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_shift_roster_version_snapshots_pub_id" ON "shift_roster_version_snapshots" USING btree ("roster_publication_id");--> statement-breakpoint
CREATE INDEX "idx_shift_templates_branch_id" ON "shift_templates" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_shift_templates_location_id" ON "shift_templates" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_work_blocks_schedule_id" ON "work_blocks" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_work_roles_name" ON "work_roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_task_activities_task_id" ON "task_activities" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_activities_actor" ON "task_activities" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_assignments_task_id" ON "task_assignments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_assignments_employee_id" ON "task_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_task_attachments_task_id" ON "task_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_attachments_uploaded_by" ON "task_attachments" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_comments_task_id" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_comments_author_user_id" ON "task_comments" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_delegations_delegator" ON "task_delegations" USING btree ("delegator_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_delegations_delegatee" ON "task_delegations" USING btree ("delegatee_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_delegations_department" ON "task_delegations" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_task_delegations_is_active" ON "task_delegations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_task_deps_task_id" ON "task_dependencies" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_deps_depends_on" ON "task_dependencies" USING btree ("depends_on_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_events_aggregate_id" ON "task_events" USING btree ("aggregate_id");--> statement-breakpoint
CREATE INDEX "idx_task_events_event_type" ON "task_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_task_events_actor_user_id" ON "task_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_events_occurred_at" ON "task_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_task_events_global_sequence" ON "task_events" USING btree ("global_sequence");--> statement-breakpoint
CREATE INDEX "idx_task_notifications_user_id" ON "task_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_notifications_task_id" ON "task_notifications" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_notifications_is_read" ON "task_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_task_recurrences_active_next_run" ON "task_recurrences" USING btree ("is_active","next_run_at");--> statement-breakpoint
CREATE INDEX "idx_task_recurrences_last_task_id" ON "task_recurrences" USING btree ("last_created_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_sla_rules_escalate_to" ON "task_sla_rules" USING btree ("escalate_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_submissions_task_id" ON "task_submissions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_task_submissions_submitted_by" ON "task_submissions" USING btree ("submitted_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_task_templates_department_id" ON "task_templates" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_task_templates_default_assignee_id" ON "task_templates" USING btree ("default_assignee_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_company_status" ON "tasks" USING btree ("status") WHERE "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee_id" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_by_user_id" ON "tasks" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_template_id" ON "tasks" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_parent_task_id" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_payroll_run_id" ON "payroll_items" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_employee_id" ON "payroll_items" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_payslip_id" ON "payroll_items" USING btree ("payslip_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_items_type" ON "payroll_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_payroll_periods_status" ON "payroll_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_payroll_period_id" ON "payroll_runs" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_branch_id" ON "payroll_runs" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_status" ON "payroll_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_approved_by_user_id" ON "payroll_runs" USING btree ("approved_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_payrolls_employee_id" ON "payrolls" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payrolls_payroll_period_id" ON "payrolls" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_payrolls_payroll_run_id" ON "payrolls" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payrolls_payslip_id" ON "payrolls" USING btree ("payslip_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_payroll_run_id" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_employee_id" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_status" ON "payslips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_salary_structures_employee_id" ON "salary_structures" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_salary_structures_is_current" ON "salary_structures" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_salary_structures_current_employee" ON "salary_structures" USING btree ("employee_id") WHERE "salary_structures"."is_current" = true;--> statement-breakpoint
CREATE INDEX "idx_statutory_rules_effective_date" ON "statutory_contribution_rules" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_tax_brackets_effective_date" ON "tax_brackets" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_attendance_agg_year_month" ON "attendance_monthly_aggregates" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_headcount_snapshots_date" ON "headcount_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_payroll_cost_period" ON "payroll_cost_summaries" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_key" ON "workflow_definitions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_is_active" ON "workflow_definitions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_transitions_instance_id" ON "workflow_instance_transitions" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_instance_transitions_occurred_at" ON "workflow_instance_transitions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_definition_id" ON "workflow_instances" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_subject" ON "workflow_instances" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_instances_status" ON "workflow_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_policies_key" ON "approval_policies" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_approval_policies_is_active" ON "approval_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_policy_id" ON "approval_requests" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_subject" ON "approval_requests" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_status" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_steps_request_id" ON "approval_steps" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_approval_steps_status" ON "approval_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_steps_approver_user_id" ON "approval_steps" USING btree ("approver_user_id");--> statement-breakpoint
CREATE INDEX "idx_leave_approval_links_leave_request_id" ON "leave_approval_links" USING btree ("leave_request_id");--> statement-breakpoint
CREATE INDEX "idx_leave_approval_links_approval_request_id" ON "leave_approval_links" USING btree ("approval_request_id");--> statement-breakpoint
CREATE INDEX "idx_leave_approval_links_status" ON "leave_approval_links" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_webhook_delivery_sub_event" ON "webhook_deliveries" USING btree ("subscription_id","event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_pending" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_event_type" ON "webhook_subscriptions" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_type" ON "chat_conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_created_by" ON "chat_conversations" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_updated_at" ON "chat_conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_chat_message_reads_conversation" ON "chat_message_reads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_message_reads_user" ON "chat_message_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conversation" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conv_created" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_sender" ON "chat_messages" USING btree ("sender_user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_deleted_at" ON "chat_messages" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_chat_participants_conversation" ON "chat_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_participants_user" ON "chat_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_health_checks_component" ON "system_health_checks" USING btree ("component");--> statement-breakpoint
CREATE INDEX "idx_health_checks_checked_at" ON "system_health_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "idx_attendance_violations_session" ON "attendance_violations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_violations_employee" ON "attendance_violations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_violations_status" ON "attendance_violations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_attendance_violations_code" ON "attendance_violations" USING btree ("code");