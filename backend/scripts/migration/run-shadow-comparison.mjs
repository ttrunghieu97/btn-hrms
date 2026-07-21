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
const thresholdPct = Number(arg("--threshold", "2"));

const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));

const byId = new Map(target.map((row) => [String(row.id), row]));
let total = 0;
let diverged = 0;

for (const l of legacy) {
  total += 1;
  const r = byId.get(String(l.id));
  if (!r) {
    diverged += 1;
    continue;
  }
  const lh = Number(l.hours ?? 0);
  const rh = Number(r.hours ?? 0);
  const lo = Number(l.overtime ?? 0);
  const ro = Number(r.overtime ?? 0);
  if (lh !== rh || lo !== ro) diverged += 1;
}

const divergencePct = total === 0 ? 0 : (diverged / total) * 100;
console.log(
  JSON.stringify(
    {
      total,
      diverged,
      divergencePct: Number(divergencePct.toFixed(4)),
      thresholdPct,
      status: divergencePct <= thresholdPct ? "pass" : "fail",
    },
    null,
    2,
  ),
);

if (divergencePct > thresholdPct) {
  process.exit(1);
}
