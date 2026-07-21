import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const legacyPath = path.resolve(appRoot, arg("--legacy", "governance/migration/samples/legacy.json"));
const targetPath = path.resolve(appRoot, arg("--target", "governance/migration/samples/target.json"));
const thresholdPct = Number(arg("--threshold", "0.5"));

const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));

const targetById = new Map(target.map((row) => [String(row.id), row]));
let mismatches = 0;
let total = 0;
const mismatchIds = [];

for (const row of legacy) {
  total += 1;
  const right = targetById.get(String(row.id));
  if (!right || JSON.stringify(row) !== JSON.stringify(right)) {
    mismatches += 1;
    mismatchIds.push(String(row.id));
  }
}

const mismatchPct = total === 0 ? 0 : (mismatches / total) * 100;
const result = {
  total,
  mismatches,
  mismatchPct: Number(mismatchPct.toFixed(4)),
  thresholdPct,
  mismatchIds,
  cutoverAllowed: mismatchPct <= thresholdPct,
};

console.log(JSON.stringify(result, null, 2));

if (!result.cutoverAllowed) {
  process.exit(1);
}
