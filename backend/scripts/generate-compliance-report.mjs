import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const governanceDir = path.join(appRoot, "governance");
const reportsDir = path.join(governanceDir, "reports");

const registry = JSON.parse(
  fs.readFileSync(path.join(governanceDir, "context-ownership.registry.json"), "utf8"),
);
const scorecard = JSON.parse(
  fs.readFileSync(path.join(governanceDir, "compliance-scorecard.model.json"), "utf8"),
);
const allowlistPath = path.join(governanceDir, "boundary-allowlist.json");
const allowlist = fs.existsSync(allowlistPath)
  ? JSON.parse(fs.readFileSync(allowlistPath, "utf8"))
  : { violations: [] };

const contexts = Array.isArray(registry.contexts) ? registry.contexts : [];
const totalWeights = Object.values(scorecard.weights || {}).reduce(
  (sum, v) => sum + Number(v || 0),
  0,
);
const baselineScore = Math.round(totalWeights * 0.72);

fs.mkdirSync(reportsDir, { recursive: true });

const lines = [];
lines.push("# Backend Compliance Report");
lines.push("");
lines.push(`- Generated at: ${new Date().toISOString()}`);
lines.push(`- Baseline score (program-level): ${baselineScore}`);
lines.push(`- Thresholds: dev=${scorecard.thresholds.dev}, staging=${scorecard.thresholds.staging}, production=${scorecard.thresholds.production}`);
lines.push(`- Allowlisted boundary violations: ${allowlist.violations?.length ?? 0}`);
lines.push("");
lines.push("## Context Scores");
lines.push("");
lines.push("| Context | Owner Team | Score | Status |");
lines.push("|---|---|---:|---|");

for (const ctx of contexts) {
  const score = baselineScore;
  const status = score >= Number(scorecard.thresholds.staging || 75)
    ? "pass"
    : "needs-remediation";
  lines.push(`| ${ctx.context} | ${ctx.ownerTeam} | ${score} | ${status} |`);
}

lines.push("");
lines.push("## Remediation Focus (This Week)");
lines.push("");
lines.push("- Reduce allowlisted boundary violations in `tasks` context.");
lines.push("- Expand runtime contract adoption beyond initial critical pairs.");
lines.push("- Increase contract test coverage for producer/consumer compatibility.");

fs.writeFileSync(path.join(reportsDir, "latest.md"), `${lines.join("\n")}\n`);
console.log(`Compliance report generated: ${path.join(reportsDir, "latest.md")}`);
