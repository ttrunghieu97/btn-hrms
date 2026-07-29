ALTER TYPE "public"."attendance_period_lock_status_enum" ADD VALUE 'in_review' BEFORE 'locked';--> statement-breakpoint
ALTER TYPE "public"."attendance_period_lock_status_enum" ADD VALUE 'closed';