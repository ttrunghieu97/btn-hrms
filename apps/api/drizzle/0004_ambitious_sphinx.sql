CREATE TABLE "timesheet_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"snapshot_version" integer DEFAULT 1 NOT NULL,
	"working_days" integer DEFAULT 0 NOT NULL,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"early_leave_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"period_status_at_snapshot" "attendance_period_lock_status_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_timesheet_snapshots_employee_period_version" UNIQUE("employee_id","period","snapshot_version")
);
--> statement-breakpoint
ALTER TABLE "timesheet_snapshots" ADD CONSTRAINT "timesheet_snapshots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_timesheet_snapshots_period" ON "timesheet_snapshots" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_timesheet_snapshots_employee_id" ON "timesheet_snapshots" USING btree ("employee_id");