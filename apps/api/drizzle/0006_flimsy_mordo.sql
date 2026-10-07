CREATE TYPE "public"."attendance_period_employee_verification_status_enum" AS ENUM('draft', 'done');--> statement-breakpoint
CREATE TABLE "attendance_period_employee_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" "attendance_period_employee_verification_status_enum" DEFAULT 'draft' NOT NULL,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_attendance_period_employee_verification" UNIQUE("period","employee_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD COLUMN "personal_break_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD COLUMN "lunch_duty_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD COLUMN "night_shift_duty_count" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" ADD COLUMN "water_booth_duty_count" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_period_employee_verification" ADD CONSTRAINT "attendance_period_employee_verification_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_period_employee_verification" ADD CONSTRAINT "attendance_period_employee_verification_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendance_period_employee_verification_period" ON "attendance_period_employee_verification" USING btree ("period");