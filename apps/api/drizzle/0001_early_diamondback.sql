CREATE TYPE "public"."attendance_period_lock_status_enum" AS ENUM('open', 'locked', 'payroll_processing', 'payroll_posted');--> statement-breakpoint
ALTER TYPE "public"."attendance_source_enum" ADD VALUE 'manual_hr';--> statement-breakpoint
ALTER TYPE "public"."attendance_source_enum" ADD VALUE 'manual_employee';--> statement-breakpoint
ALTER TYPE "public"."attendance_source_enum" ADD VALUE 'import';--> statement-breakpoint
CREATE TABLE "attendance_period_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"status" "attendance_period_lock_status_enum" DEFAULT 'open' NOT NULL,
	"locked_by_user_id" uuid,
	"locked_at" timestamp with time zone,
	"unlocked_by_user_id" uuid,
	"unlocked_at" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_period_locks_period_unique" UNIQUE("period")
);
--> statement-breakpoint
ALTER TABLE "attendance_period_locks" ADD CONSTRAINT "attendance_period_locks_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_period_locks" ADD CONSTRAINT "attendance_period_locks_unlocked_by_user_id_users_id_fk" FOREIGN KEY ("unlocked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendance_period_locks_period" ON "attendance_period_locks" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_attendance_period_locks_status" ON "attendance_period_locks" USING btree ("status");