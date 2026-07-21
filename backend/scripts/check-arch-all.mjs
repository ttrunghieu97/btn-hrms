#!/usr/bin/env node
/**
 * arch:check — Architecture Check v2 orchestrator
 *
 * Runs all individual arch checks and produces a unified summary.
 * Supports JSON output for CI/tooling.
 *
 * Usage:
 *   node scripts/check-arch-all.mjs                      # warn mode
 *   node scripts/check-arch-all.mjs --enforce-new
 *   node scripts/check-arch-all.mjs --enforce-all
 *   node scripts/check-arch-all.mjs --json                # JSON output
 *   node scripts/check-arch-all.mjs --skip-v1             # skip deprecated v1 DB check
 *   node scripts/check-arch-all.mjs --help
 *
 * Environment:
 *   ARCH_MODE=warn|enforce-new|enforce-all
 */
import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --------------- help ---------------
function help() {
  process.stdout.write(`Usage: node ${fileURLToPath(import.meta.url)} [options]

Options:
  --help            Show this help
  --json            Output JSON (for CI tools)
  --warn            Downgrade violations to warnings (default is enforce-all)
  --with-v1         Also run deprecated v1 DB access check
  --enforce-new     Only fail on new violations (outside baseline)
  --enforce-all     Fail on any violation (this is the default)

Environment:
  ARCH_MODE=warn|enforce-new|enforce-all  (overrides --enforce-*)

Exit codes:
  0   All checks passed (or violations within baseline in warn mode)
  1   At least one check failed
`);
}

// --------------- args ---------------
const args = process.argv.slice(2);
if (args.includes("--help")) { help(); process.exit(0); }

const MODE = (() => {
  if (process.env.ARCH_MODE) return process.env.ARCH_MODE.trim().toLowerCase();
  if (args.includes("--warn")) return "warn";
  if (args.includes("--enforce-new")) return "enforce-new";
  return "enforce-all";
})();
const JSON_OUTPUT = args.includes("--json");
const SKIP_V1 = !args.includes("--with-v1"); // v1 deprecated, opt-in

// --------------- validate baseline exists ---------------
const BASELINE = resolve(process.cwd(), "governance/arch-baseline.json");
try {
  await access(BASELINE);
} catch {
  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify({ status: "fail", error: `Baseline not found: ${BASELINE}` }) + "\n");
  } else {
    process.stderr.write(`[arch:check] ERROR: Baseline not found: ${BASELINE}\n`);
  }
  process.exit(1);
}

// --------------- checks config ---------------
const CHECKS = [
  { name: "Context Registry",     cmd: "node", args: ["./scripts/check-context-registry.mjs"],       severity: "fail" },
  { name: "Context Boundaries",   cmd: "node", args: ["./scripts/check-context-boundaries.mjs"],     severity: "fail" },
  { name: "DB Access (v2)",       cmd: "node", args: ["./scripts/check-direct-db-classified.mjs"],   severity: "fail" },
  { name: "Module Cycles",        cmd: "node", args: ["./scripts/check-module-cycles.mjs"],           severity: "fail" },
  { name: "Adapter DIP",          cmd: "node", args: ["./scripts/check-adapter-dip.mjs"],            severity: "fail" },
];

if (!SKIP_V1) {
  CHECKS.push({ name: "DB Access (v1 — deprecated)", cmd: "node", args: ["./scripts/check-direct-db-access.mjs"], severity: "warn" });
}

// --------------- run checks ---------------
const results = [];

for (const check of CHECKS) {
  const env = { ...process.env, ARCH_MODE: MODE };
  const start = Date.now();

  let stdout = "", stderr = "", exitCode = 0;
  try {
    const out = execFileSync(check.cmd, check.args, { cwd: process.cwd(), encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
    stdout = out.stdout || "";
    stderr = out.stderr || "";
  } catch (e) {
    stdout = e.stdout || "";
    stderr = e.stderr || "";
    exitCode = e.status || 1;
  }

  const duration = Date.now() - start;

  // Determine effective status
  let status;
  if (exitCode === 0) status = "pass";
  else if (check.severity === "warn") status = "warn";
  else status = "fail";

  results.push({
    name: check.name,
    severity: check.severity,
    status,
    exitCode,
    duration_ms: duration,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  });
}

// --------------- output ---------------
const passCount = results.filter(r => r.status === "pass").length;
const warnCount = results.filter(r => r.status === "warn").length;
const failCount = results.filter(r => r.status === "fail").length;
const overallStatus = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass";

if (JSON_OUTPUT) {
  const output = {
    status: overallStatus,
    mode: MODE,
    summary: { pass: passCount, warn: warnCount, fail: failCount },
    checks: results.map(r => ({
      name: r.name,
      status: r.status,
      severity: r.severity,
      duration_ms: r.duration_ms,
      output: r.stdout || r.stderr || null,
    })),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  process.exit(failCount > 0 ? 1 : 0);
}

// --- Text output ---
console.log("=".repeat(60));
console.log("  Architecture Check v2");
console.log(`  Mode: ${MODE}`);
console.log("=".repeat(60));
console.log();

for (const r of results) {
  const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "⚠" : "✗";
  const label = r.status === "pass" ? "PASS" : r.status === "warn" ? "WARN" : "FAIL";
  console.log(`  [${icon}] ${r.name}... ${label}  (${r.duration_ms}ms)`);

  // Print output lines (filter boilerplate)
  const out = (r.stdout || r.stderr || "").split("\n").filter(l =>
    l && !l.startsWith("[arch:") && !l.startsWith("Context registry") &&
    !l.startsWith("Done") && !l.includes("OK") && !l.includes("PASS") && !l.includes("passed") &&
    !l.startsWith("Boundary policy check") && !l.startsWith("Boundary policy")
  );
  for (const line of out.slice(0, 15)) {
    console.log(`    ${line}`);
  }
  if (out.length > 15) console.log(`    ... and ${out.length - 15} more lines`);
  console.log();
}

// --- Summary ---
console.log("-".repeat(60));
console.log("  Summary");
console.log("-".repeat(60));
console.log(`  PASS : ${passCount}`);
console.log(`  WARN : ${warnCount}`);
console.log(`  FAIL : ${failCount}`);
console.log("-".repeat(60));
console.log();

if (passCount) console.log(`  ✓ ${results.filter(r => r.status === "pass").map(r => r.name).join(", ")}`);
if (warnCount) console.log(`  ⚠ ${results.filter(r => r.status === "warn").map(r => r.name).join(", ")}`);
if (failCount) console.log(`  ✗ ${results.filter(r => r.status === "fail").map(r => r.name).join(", ")}`);

console.log();
if (overallStatus === "pass") console.log("  ✅ Architecture Check PASSED");
else if (overallStatus === "warn") console.log("  ⚠ Architecture Check PASSED WITH WARNINGS");
else console.log("  ❌ Architecture Check FAILED");
console.log();

process.exit(failCount > 0 ? 1 : 0);
