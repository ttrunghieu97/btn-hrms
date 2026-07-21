#!/usr/bin/env node
/**
 * arch:check-adapter-dip
 *
 * Dependency Inversion Principle check.  Detects when contracts/adapters/
 * and integration/ import concrete module repositories instead of ports.
 *
 * Usage:
 *   node scripts/check-adapter-dip.mjs            # warn mode
 *   node scripts/check-adapter-dip.mjs --enforce-new
 *   node scripts/check-adapter-dip.mjs --enforce-all
 *   node scripts/check-adapter-dip.mjs --json
 *   node scripts/check-adapter-dip.mjs --help
 *
 * Environment:
 *   ARCH_MODE=warn|enforce-new|enforce-all
 */
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, dirname, normalize } from "node:path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

// --------------- help ---------------
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
  process.stderr.write(`[arch:adapter-dip] ERROR: ${msg}\n`);
  process.exit(code);
}

// --------------- args ---------------
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
const SRC_CONTRACTS = resolve(ROOT, "contracts");
const SRC_INTEGRATION = resolve(ROOT, "integration");
const BASELINE_PATH = resolve(process.cwd(), "governance/arch-baseline.json");

// --------------- helpers ---------------
function normalise(p) {
  return p.replace(/\\/g, "/");
}
function relToRoot(p) {
  return normalise(relative(resolve(process.cwd()), p));
}

// --------------- load baseline ---------------
let baselineWarned = [];
try {
  await access(BASELINE_PATH);
  const raw = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  baselineWarned = (raw["adapter-dip"]?.warned || []).map(e =>
    `${relToRoot(e.from)} imports ${relToRoot(e.to)}`
  );
} catch (e) {
  if (e.code === "ENOENT") bail(`Baseline not found: ${BASELINE_PATH}`);
  bail(`Invalid baseline: ${BASELINE_PATH} — ${e.message}`);
}

const BASELINE_SET = new Set(baselineWarned);

function readImports(filePath) {
  const src = readFile(filePath, "utf8");
  const pattern = /from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  const values = [];
  let match;
  while ((match = pattern.exec(src))) {
    const specifier = match[1] || match[2];
    if (specifier) values.push(specifier);
  }
  return values;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  let base;
  if (specifier.startsWith("@/")) {
    base = resolve(ROOT, specifier.slice(2));
  } else {
    base = resolve(dirname(fromFile), specifier);
  }
  const candidates = [
    base, `${base}.ts`, `${base}.tsx`,
    resolve(base, "index.ts"), resolve(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return normalize(c);
  }
  return null;
}

function isModuleRepository(resolvedPath) {
  return resolvedPath.includes("/repositories/") &&
         resolvedPath.includes("/modules/") &&
         (resolvedPath.endsWith(".repository.ts") || resolvedPath.endsWith(".repository.tsx"));
}

// Exclude ports/ (abstractions) and infrastructure/ (system-level)
function isExcluded(p) {
  const n = normalise(p);
  return n.includes("/ports/") || n.includes("/infrastructure/") || n.includes("/services/");
}

// --------------- scan ---------------
const violations = [];
for (const dir of [SRC_CONTRACTS, SRC_INTEGRATION].filter(d => existsSync(d))) {
  const files = glob.sync("**/*.ts", {
    cwd: dir, absolute: true,
    ignore: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"],
  });
  for (const file of files) {
    if (isExcluded(file)) continue;
    const relFrom = relToRoot(file);
    for (const specifier of readImports(file)) {
      const resolved = resolveImport(file, specifier);
      if (!resolved || !isModuleRepository(resolved)) continue;
      violations.push(`${relFrom} imports ${relToRoot(resolved)}`);
    }
  }
}

// --------------- classify ---------------
const newViolations = violations.filter(v => !BASELINE_SET.has(v));
const resolvedFromBaseline = baselineWarned.filter(v => !violations.includes(v));

// --------------- output ---------------
const result = {
  status: "pass",
  mode: MODE,
  summary: {
    total: violations.length,
    baselined: violations.filter(v => BASELINE_SET.has(v)).length,
    new: newViolations.length,
    resolved: resolvedFromBaseline.length,
  },
  details: {
    current: violations,
    new: newViolations,
    resolved: resolvedFromBaseline,
  },
};

if (newViolations.length) result.status = "fail";
else if (violations.length) result.status = "warn";

if (JSON_OUTPUT) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(newViolations.length ? 1 : 0);
}

// Text output
if (violations.length) {
  console.log(`[arch:adapter-dip] ${violations.length} total DIP violation(s).`);
  console.log(`  ${result.summary.baselined} baselined, ${newViolations.length} new.`);
}
if (resolvedFromBaseline.length) {
  console.log(`\n[arch:adapter-dip] RESOLVED (can remove from baseline):`);
  for (const v of resolvedFromBaseline) console.log(`  - ${v}`);
}
if (newViolations.length) {
  console.error(`\n[arch:adapter-dip] NEW violations (not in baseline):`);
  for (const v of newViolations) console.error(`  ✗ ${v}`);
  console.error();
}

if (!violations.length) {
  console.log("[arch:adapter-dip] ✅ OK — no DIP violations detected.");
} else {
  console.log("[arch:adapter-dip] Done.");
}

let exitCode = 0;
if (MODE === "enforce-all" && violations.length) exitCode = 1;
else if (MODE === "enforce-new" && newViolations.length) exitCode = 1;
process.exit(exitCode);
