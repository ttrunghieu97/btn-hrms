#!/usr/bin/env node
/**
 * arch:check-direct-db-classified
 *
 * CQRS-aware direct DATABASE_CONNECTION check.  Classifies files by their
 * directory role and applies different policies per role.
 *
 * Roles & policy:
 *   repositories/  ✅ always allowed
 *   read-model/    ✅ always allowed
 *   query-services/✅ always allowed
 *   use-cases/     ❌ fail (must go through repository)
 *   controllers/   ❌ fail (must go through use-case)
 *   services/      ⚠ warn (unless baselined)
 *   handlers/      ⚠ warn (unless baselined)
 *   subscribers/   ⚠ warn (unless baselined)
 *   providers/     ⚠ warn (unless baselined)
 *   integration/   ⚠ warn (unless baselined)
 *   shared/        ⚠ warn (unless baselined)
 *
 * Usage:
 *   node scripts/check-direct-db-classified.mjs          # warn mode
 *   node scripts/check-direct-db-classified.mjs --enforce-new
 *   node scripts/check-direct-db-classified.mjs --enforce-all
 *   node scripts/check-direct-db-classified.mjs --json   # JSON output for CI
 *   node scripts/check-direct-db-classified.mjs --help
 *
 * Environment:
 *   ARCH_MODE=warn|enforce-new|enforce-all  (overrides --enforce-* flags)
 */
import { readFile, access } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// --------------- self-help ---------------
function help() {
  process.stdout.write(`Usage: node ${fileURLToPath(import.meta.url)} [options]

Options:
  --help            Show this help
  --json            Output JSON (for CI tools)
  --enforce-new     Fail on violations not in baseline
  --enforce-all     Fail on any violation

Environment:
  ARCH_MODE=warn|enforce-new|enforce-all  (overrides --enforce-*)

Exit codes:
  0   All checks passed (or violations within baseline in warn mode)
  1   Violations found
`);
}

function bail(msg, code = 1) {
  process.stderr.write(`[arch:db-classified] ERROR: ${msg}\n`);
  process.exit(code);
}

// --------------- parse args ---------------
const args = process.argv.slice(2);
if (args.includes("--help")) { help(); process.exit(0); }

const MODE = (() => {
  if (process.env.ARCH_MODE) return process.env.ARCH_MODE.trim().toLowerCase();
  if (args.includes("--enforce-all")) return "enforce-all";
  if (args.includes("--enforce-new")) return "enforce-new";
  return "warn";
})();
const JSON_OUTPUT = args.includes("--json");

// --------------- paths ---------------
const ROOT = resolve(process.cwd(), "src");
const BASELINE_PATH = resolve(process.cwd(), "governance/arch-baseline.json");

// --------------- helpers ---------------
function normalise(p) {
  return p.replace(/\\/g, "/").replace(/^src\//, "");
}

function classifyRole(relPath) {
  if (relPath.includes("/repositories/")) return "repositories";
  if (relPath.includes("/read-model/")) return "read-model";
  if (relPath.includes("/query-services/") || relPath.includes("/queries/")) return "query-services";
  if (relPath.includes("/use-cases/")) return "use-cases";
  if (relPath.includes("/controllers/") || relPath.endsWith(".controller.ts")) return "controllers";
  if (relPath.startsWith("integration/")) return "integration";
  if (relPath.startsWith("shared/")) return "shared";
  if (relPath.startsWith("core/") && !relPath.startsWith("core/events/")) return "core";
  if (relPath.startsWith("infrastructure/")) return "infrastructure";
  if (relPath.startsWith("app/")) return "app";
  if (relPath.includes("/services/")) return "services";
  if (relPath.includes("/handlers/") || relPath.includes("/subscribers/")) return "handlers";
  if (relPath.includes("/providers/")) return "providers";
  if (relPath.includes("/adapters/")) return "adapters";
  return "other";
}

// --------------- strip type-only imports ---------------
function hasRuntimeDbInjection(src) {
  // DATABASE_CONNECTION mentioned at all?
  if (!src.includes("DATABASE_CONNECTION")) return false;

  // If only `import type` uses DATABASE_CONNECTION, skip
  const lines = src.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip type-only imports
    if (/^import\s+type\s/.test(trimmed) && trimmed.includes("DATABASE_CONNECTION")) continue;
    if (/^import\s+.*DATABASE_CONNECTION/.test(trimmed) && /\/\/\s*@ts-expect-error\s+type-only/.test(trimmed)) continue;
    // Actual injection
    if (/@Inject\(\s*DATABASE_CONNECTION\s*\)/.test(trimmed)) return true;
    if (/inject:\s*\[[^\]]*DATABASE_CONNECTION/.test(trimmed)) return true;
  }
  return false;
}

// --------------- load baseline ---------------
let baseline = {};
try {
  await access(BASELINE_PATH);
  const raw = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  baseline = raw["direct-db"] || {};
} catch (e) {
  if (e.code === "ENOENT") bail(`Baseline not found: ${BASELINE_PATH}`);
  bail(`Invalid baseline: ${BASELINE_PATH} — ${e.message}`);
}

// Validate baseline structure
if (typeof baseline !== "object" || !baseline.system) {
  bail(`Baseline missing "direct-db.system" array`);
}

// Build lookup: path → reason
const BASELINE_MAP = new Map();
for (const cat of Object.keys(baseline)) {
  for (const entry of baseline[cat]) {
    if (entry.path) BASELINE_MAP.set(normalise(entry.path), entry.reason || cat);
  }
}

const FAIL_ROLES = new Set(["use-cases", "controllers"]);
const WARN_ROLES = new Set(["services", "handlers", "providers", "adapters", "shared", "integration", "other"]);

// --------------- scan ---------------
const files = await glob("**/*.ts", {
  cwd: ROOT,
  absolute: true,
  ignore: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"],
});

const failures = [];
const warnings = [];
const baselined = [];

for (const file of files) {
  const src = await readFile(file, "utf8");
  if (!hasRuntimeDbInjection(src)) continue;

  const rel = normalise(relative(ROOT, file));
  const role = classifyRole(rel);

  // Always-allowed roles
  if (role === "repositories" || role === "read-model" || role === "query-services") continue;
  if (role === "infrastructure" || role === "core" || role === "app") continue;

  // Check baseline
  if (BASELINE_MAP.has(rel)) {
    baselined.push({ file: rel, role, reason: BASELINE_MAP.get(rel) });
    continue;
  }

  if (FAIL_ROLES.has(role)) {
    failures.push({ file: rel, role });
  } else if (WARN_ROLES.has(role)) {
    warnings.push({ file: rel, role });
  }
}

// --------------- output ---------------
const result = {
  status: "pass",
  mode: MODE,
  summary: {
    passed: 0,
    baselined: baselined.length,
    warnings: warnings.length,
    failures: failures.length,
  },
  details: {
    baselined: baselined.map(e => `${e.file}  (${e.reason})`),
    warnings: warnings.map(e => `[${e.role}] ${e.file}`),
    failures: failures.map(e => `[${e.role}] ${e.file}`),
  },
};

if (JSON_OUTPUT) {
  if (failures.length || (MODE === "enforce-all" && warnings.length)) result.status = "fail";
  else if (warnings.length) result.status = "warn";
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.status === "fail") process.exit(1);
  process.exit(0);
}

// Text output
if (baselined.length) {
  console.log(`[arch:db-classified] ${baselined.length} baselined DATABASE_CONNECTION injections (known debt).`);
}
if (baselined.length > 0 && (warnings.length || failures.length)) console.log();

for (const w of warnings) {
  console.warn(`  ⚠ [${w.role}] ${w.file}`);
}
if (warnings.length) {
  console.warn(`[arch:db-classified] ${warnings.length} WARNING(s) — unapproved DATABASE_CONNECTION`);
  console.warn();
}

for (const f of failures) {
  console.error(`  ✗ [${f.role}] ${f.file}`);
}
if (failures.length) {
  console.error(`[arch:db-classified] ${failures.length} FAILURE(s) — must go through repository`);
  console.error();
}

// Exit
let exitCode = 0;
if (MODE === "enforce-all" && (failures.length || warnings.length)) exitCode = 1;
else if (MODE === "enforce-new" && failures.length) exitCode = 1;
else if (MODE === "warn" && failures.length) {
  console.warn(`[arch:db-classified] MODE=warn — downgraded to warning. Use --enforce-new to block new debt.`);
}

if (!failures.length && !warnings.length) {
  console.log("[arch:db-classified] ✅ OK — no unapproved DATABASE_CONNECTION outside baseline.");
} else {
  console.log("[arch:db-classified] Done.");
}

process.exit(exitCode);
