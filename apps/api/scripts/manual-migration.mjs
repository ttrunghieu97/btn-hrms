import postgres from "postgres";

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_DIRECT_URL or DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function run(stmt) {
  try {
    await sql.unsafe(stmt);
    console.log(`  OK: ${stmt.slice(0, 80)}...`);
  } catch (err) {
    // Ignore duplicate_object / duplicate_table / duplicate_column errors
    if (err.code === "42710" || err.code === "42P07" || err.code === "42701") {
      console.log(`  SKIP (exists): ${stmt.slice(0, 80)}...`);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log("Running manual migration for Phase 1-2 schema changes...");

  // 1. Create period lock status enum
  await run(`CREATE TYPE "public"."attendance_period_lock_status_enum" AS ENUM('open', 'locked', 'payroll_processing', 'payroll_posted')`);

  // 2. Extend attendance_source_enum
  for (const src of ["manual_hr", "manual_employee", "import"]) {
    try {
      await sql.unsafe(`ALTER TYPE "public"."attendance_source_enum" ADD VALUE IF NOT EXISTS '${src}'`);
    } catch {
      // PG < 9.6 fallback — just try without IF NOT EXISTS
      try {
        await sql.unsafe(`ALTER TYPE "public"."attendance_source_enum" ADD VALUE '${src}'`);
      } catch { /* already exists */ }
    }
  }

  // 3. Create attendance_period_locks table
  await run(`CREATE TABLE IF NOT EXISTS "public"."attendance_period_locks" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "period" text NOT NULL UNIQUE,
    "status" "public"."attendance_period_lock_status_enum" DEFAULT 'open' NOT NULL,
    "locked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "locked_at" timestamp with time zone,
    "unlocked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "unlocked_at" timestamp with time zone,
    "remarks" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`);

  // 4. Check constraint (IF NOT EXISTS not supported — use ALTER TABLE)
  try {
    await sql.unsafe(`ALTER TABLE "public"."attendance_period_locks" ADD CONSTRAINT "chk_attendance_period_locks_period_format" CHECK ("period" ~ '^\\d{4}-(?:0[1-9]|1[0-2])$')`);
  } catch (err) {
    if (err.code !== "42P18" && err.code !== "42601") {
      // constraint already exists or similar
      console.log("  SKIP constraint (maybe exists)");
    }
  }

  // 5. Indexes
  await run(`CREATE INDEX IF NOT EXISTS "idx_attendance_period_locks_period" ON "public"."attendance_period_locks" ("period")`);
  await run(`CREATE INDEX IF NOT EXISTS "idx_attendance_period_locks_status" ON "public"."attendance_period_locks" ("status")`);

  console.log("Done.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
