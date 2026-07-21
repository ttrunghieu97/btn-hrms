#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_BACKUP_URL || process.env.DATABASE_URL;
const backupDir = resolve(process.env.BACKUP_DIR || "backups/postgres");

if (!databaseUrl) {
  console.error("Set DATABASE_BACKUP_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = resolve(backupDir, `btn-hrms-${timestamp}.dump`);

const result = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", output, databaseUrl], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("PostgreSQL backup failed.");
  process.exit(result.status || 1);
}

console.log(`PostgreSQL backup created: ${output}`);
