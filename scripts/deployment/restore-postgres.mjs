#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [dumpPathArg] = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_RESTORE_URL || process.env.DATABASE_URL;

if (!dumpPathArg) {
  console.error("Usage: node scripts/deployment/restore-postgres.mjs <dump-file>");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Set DATABASE_RESTORE_URL or DATABASE_URL.");
  process.exit(1);
}

if (process.env.RESTORE_CONFIRM !== "I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE") {
  console.error("Set RESTORE_CONFIRM=I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE to run restore.");
  process.exit(1);
}

const dumpPath = resolve(dumpPathArg);
if (!existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

const result = spawnSync("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", databaseUrl, dumpPath], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("PostgreSQL restore failed.");
  process.exit(result.status || 1);
}

console.log("PostgreSQL restore completed.");
