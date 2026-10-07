import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const srcRoot = path.join(appRoot, "src");
const modulesRoot = path.join(srcRoot, "modules");
const allowlistPath = path.join(appRoot, "governance/arch-baseline.json");
const mode = String(process.env.ARCH_BOUNDARY_POLICY_MODE || "enforce-new")
  .trim()
  .toLowerCase();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      walk(full, out);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;
    if (entry.name.endsWith(".spec.ts")) continue;
    out.push(full);
  }
  return out;
}

function readImports(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
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
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return null;
}

function moduleContext(absolutePath) {
  const marker = `${path.sep}modules${path.sep}`;
  const idx = absolutePath.indexOf(marker);
  if (idx < 0) return null;
  const rest = absolutePath.slice(idx + marker.length);
  const [context] = rest.split(path.sep);
  return context || null;
}

function isRepositoryFile(absolutePath) {
  return (
    absolutePath.includes(`${path.sep}repositories${path.sep}`) ||
    absolutePath.endsWith(".repository.ts")
  );
}

const files = walk(modulesRoot);
const violations = [];

for (const filePath of files) {
  const fromContext = moduleContext(filePath);
  if (!fromContext) continue;

  for (const specifier of readImports(filePath)) {
    const resolved = resolveImport(filePath, specifier);
    if (!resolved) continue;

    if (resolved.includes(`${path.sep}modules${path.sep}`)) {
      const toContext = moduleContext(resolved);
      if (
        toContext &&
        toContext !== fromContext &&
        !toContext.startsWith("platform-") &&
        isRepositoryFile(resolved)
      ) {
        const relFrom = path.relative(appRoot, filePath).replace(/\\/g, "/");
        const relTo = path.relative(appRoot, resolved).replace(/\\/g, "/");
        violations.push(
          `[cross-context-repository] ${relFrom} imports ${relTo}`,
        );
      }
    }

    if (
      resolved.includes(
        `${path.sep}infrastructure${path.sep}database${path.sep}schema`,
      ) &&
      !isRepositoryFile(filePath)
    ) {
      const relFrom = path.relative(appRoot, filePath).replace(/\\/g, "/");
      const relTo = path.relative(appRoot, resolved).replace(/\\/g, "/");
      violations.push(
        `[schema-import-outside-repository] ${relFrom} imports ${relTo}`,
      );
    }
  }
}

let allowlisted = new Set();
if (fs.existsSync(allowlistPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    // Support both new arch-baseline format and legacy boundary-allowlist format
    let violationList;
    if (Array.isArray(raw)) violationList = raw;
    else if (raw.boundary && Array.isArray(raw.boundary.violations)) violationList = raw.boundary.violations;
    else if (raw.violations && Array.isArray(raw.violations)) violationList = raw.violations;
    else violationList = [];

    if (violationList.length > 0 && typeof violationList[0] === "object") {
      // New format: [{signature: "...", reason: "..."}]
      allowlisted = new Set(violationList.map((v) => v.signature));
    } else if (typeof violationList[0] === "string") {
      // Legacy format: ["[prefix] ..."]
      allowlisted = new Set(violationList);
    }
  } catch {
    console.error(`Invalid allowlist file: ${allowlistPath}`);
    process.exit(1);
  }
}

const newViolations = violations.filter((v) => !allowlisted.has(v));
const resolvedViolations = [...allowlisted].filter((v) => !violations.includes(v));

if (mode === "warn") {
  if (violations.length > 0) {
    console.warn(
      `Boundary policy warning mode: detected ${violations.length} violation(s).`,
    );
    for (const violation of violations) console.warn(`- ${violation}`);
  } else {
    console.log("Boundary policy check passed.");
  }
  process.exit(0);
}

if (mode === "enforce-all" && violations.length > 0) {
  console.error("Boundary policy violations found (enforce-all):\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

if (newViolations.length > 0) {
  console.error("Boundary policy violations found (new):\n");
  for (const violation of newViolations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

if (resolvedViolations.length > 0) {
  console.log("Boundary violations resolved and can be removed from allowlist:\n");
  for (const violation of resolvedViolations) {
    console.log(`- ${violation}`);
  }
}

if (violations.length > 0) {
  console.log(
    `Boundary policy check passed with ${violations.length} allowlisted baseline violation(s).`,
  );
} else {
  console.log("Boundary policy check passed.");
}
