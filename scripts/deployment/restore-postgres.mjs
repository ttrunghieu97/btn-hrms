#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Enterprise Safeguards for PostgreSQL Database Restore
 *
 * FAIL CLOSED:
 * 1. Requires explicit DATABASE_RESTORE_URL — NEVER falls back to DATABASE_URL.
 * 2. Blocks restoring into the active production DATABASE_URL unless explicit emergency bypass is set.
 * 3. Detects production environments and requires explicit target database validation.
 * 4. Verifies database URL format and validates expected database identity.
 * 5. Requires strict confirmation token.
 */

const args = process.argv.slice(2);
const dumpPathArg = args.find((a) => !a.startsWith("--"));
const targetDbNameFlag = args.find((a) => a.startsWith("--target-db="))?.split("=")[1];

if (!dumpPathArg) {
  console.error("Usage: node scripts/deployment/restore-postgres.mjs <dump-file> [--target-db=<db-name>]");
  process.exit(1);
}

// 1. Explicit Target Validation: NEVER fallback to live DATABASE_URL
const restoreUrl = process.env.DATABASE_RESTORE_URL;
if (!restoreUrl) {
  console.error("FATAL [RESTORE_SAFETY_GATE]: DATABASE_RESTORE_URL is not set.");
  console.error("Safety policy forbids automatic fallback to DATABASE_URL to prevent accidental production overwrite.");
  console.error("Please explicitly define DATABASE_RESTORE_URL targeting your intended destination database.");
  process.exit(1);
}

// Parse and validate URL
let parsedRestoreUrl;
try {
  parsedRestoreUrl = new URL(restoreUrl);
} catch {
  console.error("FATAL [RESTORE_SAFETY_GATE]: DATABASE_RESTORE_URL is not a valid URL format.");
  process.exit(1);
}

if (parsedRestoreUrl.protocol !== "postgres:" && parsedRestoreUrl.protocol !== "postgresql:") {
  console.error(`FATAL [RESTORE_SAFETY_GATE]: Invalid protocol '${parsedRestoreUrl.protocol}'. Expected postgres: or postgresql:.`);
  process.exit(1);
}

const targetDbName = parsedRestoreUrl.pathname.replace(/^\//, "");
if (!targetDbName) {
  console.error("FATAL [RESTORE_SAFETY_GATE]: DATABASE_RESTORE_URL does not specify a target database name in its path.");
  process.exit(1);
}

// 2. Database Identity Validation
const expectedDb = targetDbNameFlag || process.env.EXPECTED_RESTORE_DB_NAME;
if (expectedDb && expectedDb !== targetDbName) {
  console.error(`FATAL [RESTORE_SAFETY_GATE]: Target database mismatch.`);
  console.error(`DATABASE_RESTORE_URL points to '${targetDbName}', but expected database is '${expectedDb}'. Aborting.`);
  process.exit(1);
}

// 3. Prevent Colliding with Active DATABASE_URL
const activeDatabaseUrl = process.env.DATABASE_URL;
if (activeDatabaseUrl && restoreUrl === activeDatabaseUrl) {
  if (process.env.ALLOW_PRIMARY_DB_RESTORE !== "CONFIRMED_OVERWRITE_PRIMARY_DATABASE") {
    console.error("FATAL [RESTORE_SAFETY_GATE]: DATABASE_RESTORE_URL is IDENTICAL to active DATABASE_URL!");
    console.error("Overwriting the live running database is blocked by default.");
    console.error("To override for disaster recovery, set ALLOW_PRIMARY_DB_RESTORE=CONFIRMED_OVERWRITE_PRIMARY_DATABASE.");
    process.exit(1);
  }
}

// 4. Production Environment Guard
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.ENVIRONMENT === "production";

if (isProduction && process.env.ALLOW_PRODUCTION_RESTORE !== "true") {
  console.error("FATAL [RESTORE_SAFETY_GATE]: Running in a PRODUCTION environment.");
  console.error("Restores in production require explicit ALLOW_PRODUCTION_RESTORE=true.");
  process.exit(1);
}

// 5. Destructive Operation Confirmation Guard
const requiredConfirm = "I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE";
if (process.env.RESTORE_CONFIRM !== requiredConfirm) {
  console.error(`FATAL [RESTORE_SAFETY_GATE]: Missing confirmation token.`);
  console.error(`Set RESTORE_CONFIRM=${requiredConfirm} to execute restore.`);
  process.exit(1);
}

// 6. Dump File Verification
const dumpPath = resolve(dumpPathArg);
if (!existsSync(dumpPath)) {
  console.error(`FATAL [RESTORE_SAFETY_GATE]: Dump file not found: ${dumpPath}`);
  process.exit(1);
}

console.log(`[RESTORE] Validated target: host=${parsedRestoreUrl.host}, db=${targetDbName}`);
console.log(`[RESTORE] Applying dump from: ${dumpPath}`);

const result = spawnSync(
  "pg_restore",
  ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", restoreUrl, dumpPath],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  console.error(`[RESTORE] PostgreSQL restore failed with exit status ${result.status}.`);
  process.exit(result.status || 1);
}

console.log("[RESTORE] PostgreSQL restore completed successfully.");
