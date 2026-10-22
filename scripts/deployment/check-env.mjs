#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const exampleMode = args.has("--mode=example");

const DEPRECATED_KEYS = new Map([
  ["SMOKE_API_BASE_URL", "Use SMOKE_API_URL instead"],
  ["STORAGE_S3_FORCE_PATH_STYLE", "Configure forcePathStyle=true in STORAGE_S3_URL query string instead"],
  ["NEXT_PUBLIC_API_BASE_URL", "Use NEXT_PUBLIC_API_URL (client) and INTERNAL_API_URL (server) instead"],
  ["JWT_SECRET", "Use AUTH_JWT_SECRET or AUTH_COOKIE_SECRET instead"],
]);

const groups = [
  {
    name: "root compose",
    file: ".env.example",
    requiredVars: [
      "TZ",
      "APP_TIMEZONE",
      "NEXT_PUBLIC_TIMEZONE",
      "POSTGRES_USER",
      "POSTGRES_DB",
      "POSTGRES_PASSWORD",
      "MINIO_ROOT_USER",
      "MINIO_ROOT_PASSWORD",
      "APP_URL",
      "FRONTEND_URL",
      "AUTH_JWT_SECRET",
      "AUTH_JWT_REFRESH_SECRET",
      "AUTH_DEFAULT_PASSWORD",
      "PII_ENCRYPTION_KEY",
      "CLOUDFLARE_TUNNEL_TOKEN",
      "ATTENDANCE_STRICT_FACE_DETECTION",
      "ATTENDANCE_FACE_VERIFICATION_MODE",
    ],
  },
  {
    name: "api",
    file: "apps/api/.env.example",
    requiredVars: [
      "NODE_ENV",
      "HOST",
      "PORT",
      "TRUST_PROXY",
      "APP_URL",
      "APP_TIMEZONE",
      "DATABASE_URL",
      "DATABASE_DIRECT_URL",
      "AUTH_JWT_SECRET",
      "AUTH_JWT_REFRESH_SECRET",
      "AUTH_DEFAULT_PASSWORD",
      "PII_ENCRYPTION_KEY",
      "STORAGE_BACKEND",
      "STORAGE_BUCKET",
      "STORAGE_S3_URL",
      "FEATURE_SWAGGER",
      "FEATURE_DB_VERIFY",
      "FEATURE_VAULT",
      "FEATURE_REDIS_EVENT_BUS",
      "ATTENDANCE_STRICT_FACE_DETECTION",
      "ATTENDANCE_FACE_VERIFICATION_MODE",
    ],
  },
  {
    name: "web",
    file: "apps/web/.env.example",
    requiredVars: [
      "NODE_ENV",
      "PORT",
      "HOSTNAME",
      "BUILD_STANDALONE",
      "NEXT_PUBLIC_API_URL",
      "INTERNAL_API_URL",
      "NEXT_PUBLIC_TIMEZONE",
      "AUTH_COOKIE_SECRET",
      "AUTH_JWT_SECRET",
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
    entries.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim());
  }
  return entries;
}

function validateGroupEntries(groupName, getter, hasKey) {
  const errs = [];

  for (const [deprecatedKey, hint] of DEPRECATED_KEYS.entries()) {
    if (hasKey(deprecatedKey)) {
      errs.push(`${groupName}: deprecated variable ${deprecatedKey} detected (${hint})`);
    }
  }

  for (const secretKey of [
    "AUTH_JWT_SECRET",
    "AUTH_JWT_REFRESH_SECRET",
    "AUTH_COOKIE_SECRET",
    "PII_ENCRYPTION_KEY",
  ]) {
    const val = getter(secretKey);
    if (val && val.length < 32) {
      errs.push(`${groupName}: ${secretKey} must be at least 32 characters (got length ${val.length})`);
    }
  }

  const jwtSecret = getter("AUTH_JWT_SECRET");
  const jwtRefreshSecret = getter("AUTH_JWT_REFRESH_SECRET");
  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    errs.push(`${groupName}: AUTH_JWT_SECRET and AUTH_JWT_REFRESH_SECRET must be distinct values`);
  }

  const defaultPass = getter("AUTH_DEFAULT_PASSWORD");
  if (defaultPass && defaultPass.length < 12) {
    errs.push(`${groupName}: AUTH_DEFAULT_PASSWORD must be at least 12 characters`);
  }

  for (const urlKey of ["APP_URL", "FRONTEND_URL", "INTERNAL_API_URL", "STORAGE_S3_URL", "DATABASE_URL"]) {
    const val = getter(urlKey);
    if (!val) continue;
    for (const part of val.split(",").map((s) => s.trim()).filter(Boolean)) {
      try {
        new URL(part);
      } catch {
        errs.push(`${groupName}: ${urlKey} contains an invalid URL format`);
      }
    }
  }

  return errs;
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
    for (const key of group.requiredVars) {
      if (!entries.has(key) || !entries.get(key)) {
        failures.push(`${group.name}: ${group.file} missing non-empty ${key}`);
      }
    }
    failures.push(
      ...validateGroupEntries(
        `${group.name} (${group.file})`,
        (k) => entries.get(k),
        (k) => entries.has(k),
      ),
    );
    continue;
  }

  for (const key of group.requiredVars) {
    if (!process.env[key]) failures.push(`${group.name}: environment missing ${key}`);
  }
}

if (!exampleMode) {
  failures.push(
    ...validateGroupEntries(
      "runtime environment",
      (k) => process.env[k],
      (k) => process.env[k] !== undefined,
    ),
  );
}

if (failures.length > 0) {
  console.error("Deployment environment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(exampleMode ? "Deployment env examples valid." : "Deployment environment valid.");
