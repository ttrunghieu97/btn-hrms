#!/usr/bin/env node
/**
 * arch:check-module-cycles
 *
 * Detect circular dependencies between bounded contexts (modules/*) and
 * export a dependency graph in Mermaid format.
 *
 * A "context dependency" is defined as one module importing a file from
 * another module's directory.  Repositories, DTOs, and mappers are all
 * counted to produce a complete picture of coupling.
 *
 * Usage:
 *   node scripts/check-module-cycles.mjs
 *   node scripts/check-module-cycles.mjs --json
 *   node scripts/check-module-cycles.mjs --graph     # print Mermaid
 *   node scripts/check-module-cycles.mjs --graph > dep-graph.md
 *   node scripts/check-module-cycles.mjs --help
 *
 * Graph:
 *   Cycles  ❌ printed at the top as error nodes
 *   Edges   weighted by import count
 *   Layout  directed top-to-bottom, LR for wide graphs
 */
import { readFileSync, existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { resolve, relative, dirname, normalize } from "node:path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

// --------------- help ---------------
function help() {
  process.stdout.write(`Usage: node ${fileURLToPath(import.meta.url)} [options]

Options:
  --help            Show this help
  --json            Output JSON (machine-readable)
  --graph           Print Mermaid flowchart
  --enforce-new     Fail only on new cycles (not in baseline)
  --enforce-all     Fail on any cycle

Environment:
  ARCH_MODE=warn|enforce-new|enforce-all  (overrides --enforce-*)

Exit codes:
  0   No circular dependencies found (or baselined in warn mode)
  1   Circular dependencies detected
`);
}

// --------------- load baseline ---------------
const BASELINE_PATH = resolve(process.cwd(), "governance/arch-baseline.json");
let baselineCycles = [];
try {
  await access(BASELINE_PATH);
  const raw = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  baselineCycles = (raw.cycles?.known || []).map(c => c.join("|"));
} catch {
  // no baseline cycles, all cycles are new
}
const BASELINE_CYCLE_SET = new Set(baselineCycles);

const args = process.argv.slice(2);
if (args.includes("--help")) { help(); process.exit(0); }

const MODE = (() => {
  if (process.env.ARCH_MODE) return process.env.ARCH_MODE.trim().toLowerCase();
  if (args.includes("--enforce-all")) return "enforce-all";
  if (args.includes("--enforce-new")) return "enforce-new";
  return "warn";
})();
const JSON_OUTPUT = args.includes("--json");
const GRAPH_OUTPUT = args.includes("--graph");

// --------------- paths ---------------
const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, "src");
const MODULES = resolve(SRC, "modules");
const CONTRACTS = resolve(SRC, "contracts");

// --------------- helpers ---------------
function normalise(p) {
  return p.replace(/\\/g, "/");
}
function relToRoot(p) {
  return normalise(relative(ROOT, p));
}

// Get the bounded-context name from a path
function contextOf(absolutePath) {
  // Check contracts/ first
  if (absolutePath.startsWith(CONTRACTS)) return "contracts";

  const marker = "/modules/";
  const idx = absolutePath.indexOf(marker);
  if (idx < 0) return null;
  const rest = absolutePath.slice(idx + marker.length);
  return rest.split("/")[0] || null;
}

function readImports(filePath) {
  const src = readFileSync(filePath, "utf8");
  // Only care about module<->module and module<->contract imports
  const pattern = /from\s+["']([^"']+)["']/g;
  const values = [];
  let match;
  while ((match = pattern.exec(src))) {
    const specifier = match[1];
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      values.push(specifier);
    }
  }
  return values;
}

function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = resolve(SRC, specifier.slice(2));
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

// --------------- scan module files ---------------
const files = glob.sync("**/*.ts", {
  cwd: MODULES,
  absolute: true,
  ignore: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
});

// Build adjacency: Map<fromContext, Map<toContext, count>>
const adj = new Map();
const edgeFiles = new Map(); // "from→to" → array of files

for (const file of files) {
  const fromCtx = contextOf(file);
  if (!fromCtx) continue;

  for (const specifier of readImports(file)) {
    const resolved = resolveImport(file, specifier);
    if (!resolved) continue;

    const toCtx = contextOf(resolved);
    if (!toCtx || toCtx === fromCtx) continue;

    // Add edge
    if (!adj.has(fromCtx)) adj.set(fromCtx, new Map());
    const edges = adj.get(fromCtx);
    edges.set(toCtx, (edges.get(toCtx) || 0) + 1);

    // Track file-level evidence
    const key = `${fromCtx}→${toCtx}`;
    if (!edgeFiles.has(key)) edgeFiles.set(key, []);
    const list = edgeFiles.get(key);
    const relF = normalise(relative(ROOT, file));
    const relT = normalise(relative(ROOT, resolved));
    list.push(`${relF} → ${relT}`);
  }
}

// --------------- cycle detection (Tarjan SCC) ---------------
// All unique context names
const allContexts = [...new Set([...adj.keys()].flatMap(k => [k, ...adj.get(k).keys()]))].sort();
const indexMap = new Map();
allContexts.forEach((c, i) => indexMap.set(c, i));
const N = allContexts.length;

// Build full adjacency matrix for cycle detection
const graphEdges = allContexts.map(() => []);
for (const [from, targets] of adj) {
  const fi = indexMap.get(from);
  if (fi === undefined) continue;
  for (const [to] of targets) {
    const ti = indexMap.get(to);
    if (ti !== undefined) graphEdges[fi].push(ti);
  }
}

// Tarjan SCC
let idx = 0;
const disc = new Array(N).fill(-1);
const low = new Array(N).fill(-1);
const onStack = new Array(N).fill(false);
const stack = [];
const sccs = [];

function tarjan(v) {
  disc[v] = low[v] = idx++;
  stack.push(v);
  onStack[v] = true;
  for (const w of graphEdges[v]) {
    if (disc[w] === -1) { tarjan(w); low[v] = Math.min(low[v], low[w]); }
    else if (onStack[w]) low[v] = Math.min(low[v], disc[w]);
  }
  if (low[v] === disc[v]) {
    const component = [];
    while (true) {
      const w = stack.pop();
      onStack[w] = false;
      component.push(allContexts[w]);
      if (w === v) break;
    }
    // Only cycles (size > 1) or self-loops
    if (component.length > 1) {
      sccs.push({ contexts: component.sort(), evidence: [] });
    } else {
      // Check for self-loop in adjacency
      const ci = indexMap.get(component[0]);
      if (ci !== undefined && graphEdges[ci].includes(ci)) {
        sccs.push({ contexts: component, evidence: [] });
      }
    }
  }
}
for (let v = 0; v < N; v++) {
  if (disc[v] === -1) tarjan(v);
}

// Deduplicate cycles
const cycles = [...sccs];
// Check for self-loops
for (const [ctx] of adj) {
  const ci = indexMap.get(ctx);
  if (ci !== undefined && graphEdges[ci].includes(ci)) {
    if (!cycles.some(c => (c.contexts || []).length === 1 && c.contexts[0] === ctx)) {
      // Build evidence for self-loop
      const selfKey = `${ctx}→${ctx}`;
      const ev = edgeFiles.has(selfKey) ? edgeFiles.get(selfKey) : [];
      cycles.push({ contexts: [ctx], evidence: ev });
    }
  }
}

// --------------- build output ---------------
const depList = [];
for (const [from, targets] of adj) {
  for (const [to, count] of targets) {
    depList.push({ from, to, count, files: edgeFiles.get(`${from}→${to}`) || [] });
  }
}
depList.sort((a, b) => b.count - a.count);

const result = {
  status: cycles.length === 0 ? "pass" : "fail",
  summary: {
    contexts: allContexts.length,
    edges: depList.length,
    cycles: cycles.length,
  },
  cycles: cycles.map(comp => {
    const names = comp.contexts;
    const ev = [];
    for (const c of names) {
      for (const other of names) {
        if (c === other) continue;
        const key = `${c}→${other}`;
        if (edgeFiles.has(key)) ev.push(...edgeFiles.get(key));
      }
    }
    return { contexts: names, evidence: ev };
  }),
  dependencies: depList,
  _meta: {
    baselined: cycles.filter(c => BASELINE_CYCLE_SET.has(c.contexts.join("|"))).length,
    new_cycles: cycles.filter(c => !BASELINE_CYCLE_SET.has(c.contexts.join("|"))).length,
  },
};

// --------------- output ---------------
if (JSON_OUTPUT) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  const newCount = result._meta.new_cycles || cycles.length;
  if (MODE === "enforce-all" && cycles.length) process.exit(1);
  if (MODE === "enforce-new" && newCount) process.exit(1);
  if (MODE === "warn" && cycles.length) process.exit(1);
  process.exit(0);
}

// --- Graph output only ---
if (GRAPH_OUTPUT) {
  console.log(`%% Dependency graph — ${allContexts.length} contexts, ${depList.length} edges`);
  console.log("flowchart LR");
  for (const cycle of cycles) {
    for (const c of cycle.contexts) {
      console.log(`  ${c.replace(/-/g, "_")}:::cycle`);
    }
  }
  console.log();
  for (const dep of depList) {
    const fromId = dep.from.replace(/-/g, "_");
    const toId = dep.to.replace(/-/g, "_");
    const isCycle = cycles.some(c => c.contexts.includes(dep.from) && c.contexts.includes(dep.to));
    const style = isCycle ? "x-->|" : "--->|";
    console.log(`  ${fromId} ${style}${dep.count}| ${toId}`);
  }
  console.log();
  if (cycles.length > 0) {
    console.log("  classDef cycle fill:#f99,stroke:#c00,stroke-width:2px;");
  }
  console.log(`\n%% ${cycles.length ? `⚠ ${cycles.length} cycle(s) detected` : "✅ acyclic"}`);
  process.exit(0);
}

// --- Text output ---
const exitCode = (() => {
  const newCount = result._meta.new_cycles || 0;
  if (cycles.length === 0) return 0;
  if (MODE === "enforce-all") return 1; // fail on any cycle
  if (newCount === 0) {
    // All cycles baselined — pass in warn or enforce-new
    console.error(`\n[arch:cycles] ⚠ ${cycles.length} cycle(s) — all baselined, not failing in ${MODE} mode.\n`);
    return 0;
  }
  return 1; // new cycles found
})();

if (cycles.length > 0) {
  console.error(`[arch:cycles] ❌ ${cycles.length} circular dependenc(ies) detected:\n`);
  for (const cycle of cycles) {
    const names = cycle.contexts || [];
    if (names.length > 1) {
      console.error(`  ${names.join(" → ")} → ${names[0]}`);
    } else {
      console.error(`  ${names[0]} (self-loop)`);
    }
    const evs = cycle.evidence || [];
    for (const ev of evs.slice(0, 5)) {
      console.error(`    ${ev}`);
    }
    if (evs.length > 5) console.error(`    ... and ${evs.length - 5} more`);
    console.error();
  }
}

if (cycles.length === 0) {
  console.log(`[arch:cycles] ✅ OK — ${allContexts.length} contexts, ${depList.length} edges, no cycles.`);
}
process.exit(exitCode);
