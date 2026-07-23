#!/usr/bin/env node
/**
 * arch:check-contracts-boundary — Architecture Rule #6
 *
 * Enforces that modules/ only communicate across bounded contexts through
 * contracts/ ports.  Imports of foreign module internals (repositories,
 * services, use-cases, controllers) are forbidden.
 *
 * ALLOWED patterns:
 *   modules/A → modules/B  ✗ (forbidden, unless baseline)
 *   modules/A → contracts/  ✓
 *   modules/A → core/       ✓
 *   modules/A → shared/     ✓
 *   modules/A → infrastructure/ ✓
 *   modules/A → modules/A   ✓ (same context)
 *
 * Usage:
 *   node scripts/check-contracts-boundary.mjs
 *   node scripts/check-contracts-boundary.mjs --json
 *   node scripts/check-contracts-boundary.mjs --help
 *
 * Environment:
 *   ARCH_MODE=warn|enforce-new|enforce-all
 */
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, dirname, normalize, sep } from "node:path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

function help() {
  process.stdout.write(`Usage: node ${fileURLToPath(import.meta.url)} [options]

Options:
  --help            Show this help
  --json            Output JSON

Environment:
  ARCH_MODE=warn|enforce-new|enforce-all
`);
}

const args = process.argv.slice(2);
if (args.includes("--help")) { help(); process.exit(0); }

const MODE = (() => {
  if (process.env.ARCH_MODE) return process.env.ARCH_MODE.trim().toLowerCase();
  return "enforce-new";
})();
const JSON_OUTPUT = args.includes("--json");

const ROOT = resolve(process.cwd(), "src");
const MODULES = resolve(ROOT, "modules");
const BASELINE_PATH = resolve(process.cwd(), "governance/arch-baseline.json");

// --------------- helpers ---------------
function rel(p) {
  return relative(resolve(process.cwd()), p).replace(/\\/g, "/");
}
function normalise(p) {
  return p.replace(/\\/g, "/");
}

// --------------- baseline ---------------
let baselineViolations = [];
try {
  await access(BASELINE_PATH);
  const raw = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  baselineViolations = (raw["contracts-boundary"]?.violations || []).map(
    (v) => (typeof v === "string" ? v : v.signature)
  );
} catch (e) {
  if (e.code !== "ENOENT") {
    process.stderr.write(`[arch:contracts-boundary] ERROR: ${e.message}\n`);
    process.exit(1);
  }
}
const BASELINE = new Set(baselineViolations);

// --------------- detect module context ---------------
function moduleContext(absPath) {
  const marker = `${sep}modules${sep}`;
  const idx = absPath.indexOf(marker);
  if (idx < 0) return null;
  const rest = absPath.slice(idx + marker.length);
  return rest.split(sep)[0] || null;
}

// --------------- classify targets ---------------
function isForeignModuleTarget(absPath) {
  return absPath.includes(`${sep}modules${sep}`) &&
    !absPath.includes(`${sep}contracts${sep}`) &&
    !absPath.includes(`${sep}infrastructure${sep}`);
}

function isSensitiveImport(absPath) {
  // What we consider "module internals" — repos, services, use-cases, controllers
  const sensitivePatterns = [
    "/repositories/", "/use-cases/", "/usecases/",
    "/services/", "/controllers/", "/handlers/",
    "/gateways/", "/jobs/", "/pipeline/",
    "/policies/", "/subscribers/",
  ];
  const n = normalise(absPath);
  return sensitivePatterns.some((p) => n.includes(p));
}

// --------------- resolve imports ---------------
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
  // Only handle relative or @/ alias
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

  // Handle directory imports without index — e.g., "../foo" → "../foo/index.ts"
  const dirCandidates = [
    resolve(base, "index.ts"), resolve(base, "index.tsx"),
  ];
  for (const c of dirCandidates) {
    if (existsSync(c)) return normalize(c);
  }

  return null;
}

// --------------- main scan ---------------
const files = glob.sync("**/*.ts", {
  cwd: MODULES, absolute: true,
  ignore: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
});

const violations = [];

for (const filePath of files) {
  const fromCtx = moduleContext(filePath);
  if (!fromCtx || fromCtx.startsWith("platform-")) continue; // platform-* modules are shared infra

  for (const specifier of readImports(filePath)) {
    const resolved = resolveImport(filePath, specifier);
    if (!resolved) continue;

    // Only care about imports that go to other modules
    if (!isForeignModuleTarget(resolved)) continue;

    const toCtx = moduleContext(resolved);
    if (!toCtx || toCtx === fromCtx) continue; // same context — OK
    if (toCtx.startsWith("platform-")) continue; // platform modules are shared infra

    // Check that it's importing sensitive internals
    if (!isSensitiveImport(resolved)) continue;

    const sig = `${rel(filePath)} imports ${rel(resolved)}`;
    violations.push(sig);
  }
}

// --------------- classify ---------------
const newViolations = violations.filter((v) => !BASELINE.has(v));
const resolvedFromBaseline = baselineViolations.filter((v) => !violations.includes(v));

// --------------- output ---------------
const result = {
  status: newViolations.length > 0 ? "fail" : violations.length > 0 ? "warn" : "pass",
  mode: MODE,
  summary: {
    total: violations.length,
    baselined: violations.filter((v) => BASELINE.has(v)).length,
    new: newViolations.length,
    resolved: resolvedFromBaseline.length,
  },
  details: {
    current: violations,
    new: newViolations,
    resolved: resolvedFromBaseline,
  },
};

if (JSON_OUTPUT) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(newViolations.length > 0 ? 1 : 0);
}

if (violations.length) {
  console.log(`[arch:contracts-boundary] ${violations.length} cross-module import violation(s).`);
  console.log(`  ${result.summary.baselined} baselined, ${newViolations.length} new.`);
}
if (resolvedFromBaseline.length) {
  console.log(`\n  ✓ RESOLVED (remove from baseline):`);
  for (const v of resolvedFromBaseline) console.log(`    - ${v}`);
}
if (newViolations.length) {
  console.error(`\n  ✗ NEW violations (must use contracts/):`);
  for (const v of newViolations) console.error(`    - ${v}`);
  console.error();
}

if (!violations.length) {
  console.log("[arch:contracts-boundary] ✅ OK — no cross-module violations detected.");
} else {
  console.log("[arch:contracts-boundary] Done.");
}

let exitCode = 0;
if (MODE === "enforce-all" && violations.length) exitCode = 1;
else if (MODE === "enforce-new" && newViolations.length) exitCode = 1;
process.exit(exitCode);
