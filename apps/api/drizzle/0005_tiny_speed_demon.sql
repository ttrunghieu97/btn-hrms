CREATE TYPE "public"."attendance_adjustment_field_enum" AS ENUM('REGULAR_HOURS', 'OVERTIME_HOURS', 'WORKING_DAY_STATUS');--> statement-breakpoint
CREATE TYPE "public"."attendance_adjustment_status_enum" AS ENUM('draft', 'requested', 'under_review', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_diff_type_enum" AS ENUM('MATCH', 'MISSING_ATTENDANCE_SNAPSHOT', 'MISSING_PAYROLL_INPUT', 'REGULAR_HOURS_MISMATCH', 'OVERTIME_MISMATCH', 'EMPLOYEE_NOT_FOUND', 'DUPLICATE_RECORD');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status_enum" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payroll_calculation_version_status_enum" AS ENUM('draft', 'active', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payroll_input_snapshot_status_enum" AS ENUM('generating', 'ready', 'consumed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."payroll_input_type_enum" AS ENUM('ATTENDANCE_REGULAR_MINUTES', 'ATTENDANCE_OVERTIME_MINUTES', 'ATTENDANCE_ADJUSTMENT_REGULAR', 'ATTENDANCE_ADJUSTMENT_OVERTIME', 'BASE_SALARY', 'ALLOWANCE_TOTAL', 'DEDUCTION_TOTAL');--> statement-breakpoint
CREATE TABLE "attendance_adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"field_name" "attendance_adjustment_field_enum" NOT NULL,
	"old_value" integer DEFAULT 0 NOT NULL,
	"new_value" integer DEFAULT 0 NOT NULL,
	"delta" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" "attendance_adjustment_status_enum" DEFAULT 'draft' NOT NULL,
	"reason" text NOT NULL,
	"requested_by_user_id" uuid,
	"requested_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_payroll_reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_regular_hours" integer DEFAULT 0 NOT NULL,
	"payroll_regular_hours" integer DEFAULT 0 NOT NULL,
	"attendance_overtime_hours" integer DEFAULT 0 NOT NULL,
	"payroll_overtime_hours" integer DEFAULT 0 NOT NULL,
	"diff_type" "reconciliation_diff_type_enum" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_payroll_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"status" "reconciliation_status_enum" DEFAULT 'pending' NOT NULL,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"mismatch_count" integer DEFAULT 0 NOT NULL,
	"checked_by_user_id" uuid,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_period_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"from_status" "attendance_period_lock_status_enum" NOT NULL,
	"to_status" "attendance_period_lock_status_enum" NOT NULL,
	"changed_by_user_id" uuid,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_calculation_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"rule_name" text NOT NULL,
	"rule_version" text NOT NULL,
	"result_value" text,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_calculation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "payroll_calculation_version_status_enum" DEFAULT 'draft' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_calculation_versions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payroll_export_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"action" text NOT NULL,
	"performed_by_user_id" uuid,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_input_snapshot_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"input_type" "payroll_input_type_enum" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"source_reference" text
);
--> statement-breakpoint
CREATE TABLE "payroll_input_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" "payroll_input_snapshot_status_enum" DEFAULT 'generating' NOT NULL,
	"source_versions" jsonb NOT NULL,
	"generated_by_user_id" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_input_snapshots_run_employee" UNIQUE("payroll_run_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_run_approval_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"action" text NOT NULL,
	"performed_by_user_id" uuid,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_totp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "calculation_version_id" uuid;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "calculation_hash" text;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "posted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "publication_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "publication_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD COLUMN "publication_reference" text;--> statement-breakpoint
ALTER TABLE "attendance_adjustment_items" ADD CONSTRAINT "attendance_adjustment_items_adjustment_id_attendance_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."attendance_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_payroll_reconciliation_items" ADD CONSTRAINT "attendance_payroll_reconciliation_items_reconciliation_id_attendance_payroll_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."attendance_payroll_reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_payroll_reconciliation_items" ADD CONSTRAINT "attendance_payroll_reconciliation_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_payroll_reconciliations" ADD CONSTRAINT "attendance_payroll_reconciliations_checked_by_user_id_users_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_period_history" ADD CONSTRAINT "attendance_period_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_calculation_metadata" ADD CONSTRAINT "payroll_calculation_metadata_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_calculation_versions" ADD CONSTRAINT "payroll_calculation_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_export_history" ADD CONSTRAINT "payroll_export_history_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_export_history" ADD CONSTRAINT "payroll_export_history_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshot_items" ADD CONSTRAINT "payroll_input_snapshot_items_snapshot_id_payroll_input_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."payroll_input_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" ADD CONSTRAINT "payroll_input_snapshots_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" ADD CONSTRAINT "payroll_input_snapshots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" ADD CONSTRAINT "payroll_input_snapshots_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_run_approval_history" ADD CONSTRAINT "payroll_run_approval_history_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_run_approval_history" ADD CONSTRAINT "payroll_run_approval_history_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjustment_items_adjustment_id" ON "attendance_adjustment_items" USING btree ("adjustment_id");--> statement-breakpoint
CREATE INDEX "idx_adjustments_period" ON "attendance_adjustments" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_adjustments_employee_id" ON "attendance_adjustments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_adjustments_status" ON "attendance_adjustments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_items_recon_id" ON "attendance_payroll_reconciliation_items" USING btree ("reconciliation_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_items_employee_id" ON "attendance_payroll_reconciliation_items" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_period" ON "attendance_payroll_reconciliations" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_status" ON "attendance_payroll_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_attendance_period_history_period" ON "attendance_period_history" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_attendance_period_history_created_at" ON "attendance_period_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_calc_metadata_payroll_run_id" ON "payroll_calculation_metadata" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_calc_versions_status" ON "payroll_calculation_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_calc_versions_effective_from" ON "payroll_calculation_versions" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "idx_export_history_payroll_run_id" ON "payroll_export_history" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_snapshot_items_snapshot_id" ON "payroll_input_snapshot_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_input_snapshots_payroll_run_id" ON "payroll_input_snapshots" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_input_snapshots_employee_id" ON "payroll_input_snapshots" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_approval_history_payroll_run_id" ON "payroll_run_approval_history" USING btree ("payroll_run_id");--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_calculation_version_id_payroll_calculation_versions_id_fk" FOREIGN KEY ("calculation_version_id") REFERENCES "public"."payroll_calculation_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_posted_by_user_id_users_id_fk" FOREIGN KEY ("posted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;