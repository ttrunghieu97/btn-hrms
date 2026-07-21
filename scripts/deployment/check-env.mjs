#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const exampleMode = args.has("--mode=example");

const groups = [
  {
    name: "root compose",
    file: ".env.example",
    vars: [
      "POSTGRES_PASSWORD",
      "MINIO_ROOT_USER",
      "MINIO_ROOT_PASSWORD",
      "APP_URL",
      "AUTH_JWT_SECRET",
      "AUTH_JWT_REFRESH_SECRET",
      "AUTH_DEFAULT_PASSWORD",
    ],
  },
  {
    name: "api",
    file: "backend/.env.example",
    vars: [
      "NODE_ENV",
      "PORT",
      "APP_URL",
      "DATABASE_URL",
      "DATABASE_DIRECT_URL",
      "REDIS_URL",
      "AUTH_JWT_SECRET",
      "AUTH_JWT_REFRESH_SECRET",
      "DEFAULT_EMPLOYEE_PASSWORD",
      "STORAGE_BACKEND",
      "STORAGE_BUCKET",
      "STORAGE_S3_URL",
      "BOOT_ENABLE_SWAGGER",
      "BOOT_VERIFY_DB",
    ],
  },
  {
    name: "web",
    file: "frontend/.env.example",
    vars: [
      "NODE_ENV",
      "PORT",
      "HOSTNAME",
      "BUILD_STANDALONE",
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_SENTRY_DISABLED",
    ],
  },
];

function parseEnvFile(path) {
  const content = readFileSync(path, "utf8");
  const entries = new Map();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return entries;
}

const failures = [];

for (const group of groups) {
  if (exampleMode) {
    const path = resolve(group.file);
    if (!existsSync(path)) {
      failures.push(`${group.name}: missing ${group.file}`);
      continue;
    }
    const entries = parseEnvFile(path);
    for (const key of group.vars) {
      if (!entries.has(key)) failures.push(`${group.name}: ${group.file} missing ${key}`);
    }
    continue;
  }

  for (const key of group.vars) {
    if (!process.env[key]) failures.push(`${group.name}: environment missing ${key}`);
  }
}

if (failures.length > 0) {
  console.error("Deployment environment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(exampleMode ? "Deployment env examples valid." : "Deployment environment valid.");
