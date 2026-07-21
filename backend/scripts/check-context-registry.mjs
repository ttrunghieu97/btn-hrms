import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const registryPath = path.join(
  appRoot,
  "governance/context-ownership.registry.json",
);
const modulesRoot = path.join(appRoot, "src/modules");

if (!fs.existsSync(registryPath)) {
  console.error(`Missing registry file: ${registryPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(registryPath, "utf8");
const parsed = JSON.parse(raw);
const contexts = Array.isArray(parsed.contexts) ? parsed.contexts : [];

const moduleContexts = fs
  .readdirSync(modulesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const contextMap = new Map(contexts.map((ctx) => [ctx.context, ctx]));
const errors = [];

for (const context of moduleContexts) {
  const row = contextMap.get(context);
  if (!row) {
    errors.push(`Missing context in registry: ${context}`);
    continue;
  }

  const requiredStringFields = ["ownerTeam", "onCall"];
  for (const field of requiredStringFields) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      errors.push(`Context '${context}' missing required field '${field}'`);
    }
  }

  const requiredArrayFields = [
    "writeModels",
    "integrationEntrypoints",
    "approvedDependencies",
  ];
  for (const field of requiredArrayFields) {
    if (!Array.isArray(row[field]) || row[field].length === 0) {
      errors.push(`Context '${context}' missing non-empty array '${field}'`);
    }
  }
}

for (const listed of contextMap.keys()) {
  if (!moduleContexts.includes(listed)) {
    errors.push(`Registry context has no matching module folder: ${listed}`);
  }
}

if (errors.length > 0) {
  console.error("Context registry validation failed:\n");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(
  `Context registry validation passed (${moduleContexts.length} contexts).`,
);
