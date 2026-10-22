#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(appRoot, "src");

function walk(dir, filter = () => true) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage"].includes(entry.name)) continue;
      results = results.concat(walk(full, filter));
    } else if (filter(full)) {
      results.push(full);
    }
  }
  return results;
}

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) {
    base = path.join(srcRoot, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null;
  }
  const exts = [".ts", ".js", "/index.ts", "/index.js"];
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of exts) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
      return base + ext;
    }
  }
  return null;
}

function getImports(file) {
  const raw = fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
  const specs = new Set();
  const re =
    /(?:import|export)\s+(?:[^;'"]*?from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)|require\(["']([^"']+)["']\)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1] || m[2] || m[3];
    if (s) {
      const resolved = resolveImport(file, s);
      if (resolved) specs.add(resolved);
    }
  }
  return [...specs];
}

const prodFiles = walk(
  srcRoot,
  (f) =>
    f.endsWith(".ts") &&
    !f.endsWith(".spec.ts") &&
    !f.endsWith(".e2e-spec.ts") &&
    !f.endsWith(".d.ts"),
);

const entrypoints = prodFiles.filter((f) => {
  const rel = path.relative(srcRoot, f).replace(/\\/g, "/");
  return (
    rel === "main.ts" ||
    rel === "app/main.ts" ||
    rel.startsWith("scripts/") ||
    rel.startsWith("infrastructure/database/schema/") ||
    rel === "infrastructure/database/seed.ts" ||
    rel === "infrastructure/database/seed-roles.ts" ||
    rel === "infrastructure/database/reset.ts"
  );
});

const visited = new Set();
const queue = [...entrypoints];
while (queue.length > 0) {
  const curr = queue.pop();
  if (!curr || visited.has(curr)) continue;
  visited.add(curr);
  for (const imp of getImports(curr)) {
    if (!visited.has(imp)) queue.push(imp);
  }
}

const orphans = prodFiles
  .filter((f) => !visited.has(f))
  .map((f) => path.relative(appRoot, f).replace(/\\/g, "/"))
  .sort();

if (orphans.length > 0) {
  console.error(`Orphan files detected (${orphans.length}):`);
  for (const orphan of orphans) {
    console.error(`- ${orphan}`);
  }
  process.exit(1);
}

console.log(
  `Orphan file check passed (${prodFiles.length} production files reachable).`,
);
