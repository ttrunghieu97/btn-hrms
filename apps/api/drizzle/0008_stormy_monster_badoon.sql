ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DELETE FROM "attendance_violations" "av"
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "employee_id", "session_id", "code"
        ORDER BY
          CASE WHEN "status" IN ('RESOLVED', 'WAIVED') THEN 0 ELSE 1 END,
          "updated_at" DESC,
          "created_at" DESC,
          "id" DESC
      ) AS "rn"
    FROM "attendance_violations"
    WHERE "session_id" IS NOT NULL
  ) "ranked"
  WHERE "ranked"."rn" > 1
) "dups"
WHERE "av"."id" = "dups"."id";--> statement-breakpoint
DELETE FROM "attendance_violations" "av"
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "employee_id", "code", coalesce("metadata"->>'dedupKey', "metadata"->>'date', '')
        ORDER BY
          CASE WHEN "status" IN ('RESOLVED', 'WAIVED') THEN 0 ELSE 1 END,
          "updated_at" DESC,
          "created_at" DESC,
          "id" DESC
      ) AS "rn"
    FROM "attendance_violations"
    WHERE "session_id" IS NULL
  ) "ranked"
  WHERE "ranked"."rn" > 1
) "dups"
WHERE "av"."id" = "dups"."id";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_violations_session_emp_code" ON "attendance_violations" USING btree ("employee_id","session_id","code") WHERE "attendance_violations"."session_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_violations_null_session_dedup" ON "attendance_violations" USING btree ("employee_id","code",coalesce("metadata"->>'dedupKey', "metadata"->>'date', '')) WHERE "attendance_violations"."session_id" is null;