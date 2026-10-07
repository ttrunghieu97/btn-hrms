import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const debtPath = path.join(appRoot, "governance/compatibility-debt.json");
const eventBusPath = path.join(
  appRoot,
  "src/core/events/redis-durable-event-bus.service.ts",
);

if (!fs.existsSync(debtPath)) {
  console.error(`Missing compatibility debt file: ${debtPath}`);
  process.exit(1);
}

const todayIso = new Date().toISOString().slice(0, 10);
const debt = JSON.parse(fs.readFileSync(debtPath, "utf8"));
const debts = Array.isArray(debt.debts) ? debt.debts : [];
const expired = debts.filter(
  (d) => String(d.status || "active") === "active" && String(d.expiresAt || "") < todayIso,
);

if (expired.length > 0) {
  console.error("Expired compatibility debts found:");
  for (const d of expired) {
    console.error(`- ${d.id} (expired ${d.expiresAt}) owner=${d.owner}`);
  }
  process.exit(1);
}

const eventBusSource = fs.readFileSync(eventBusPath, "utf8");
if (eventBusSource.includes("eventType ?? (envelope as any).eventName")) {
  console.error("Legacy event envelope fallback still exists in redis event bus.");
  process.exit(1);
}

console.log(
  `Compatibility cleanup check passed (${debts.length} active debt item(s), none expired).`,
);
