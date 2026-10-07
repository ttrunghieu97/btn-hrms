import postgres from "postgres";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadEnv } from "./env";

type ResetEnv = NodeJS.ProcessEnv;

export type ResetTargetInfo = {
  database: string;
  host: string;
  port: string;
  user: string;
};

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function requireFlag(env: ResetEnv, name: string) {
  if (env[name] !== "true") {
    throw new Error(`${name}=true is required before resetting the database`);
  }
}

export function parseResetTarget(connectionString: string): ResetTargetInfo {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }
  return {
    database,
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username || "unknown"),
  };
}

export function assertResetAllowed(env: ResetEnv, target: ResetTargetInfo) {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to reset database when NODE_ENV=production");
  }

  requireFlag(env, "ALLOW_DB_RESET");

  if (!LOCAL_DB_HOSTS.has(target.host) && env.ALLOW_REMOTE_DB_RESET !== "true") {
    throw new Error(
      `Refusing to reset remote database host ${target.host}. Set ALLOW_REMOTE_DB_RESET=true to override.`,
    );
  }
}

function printTarget(target: ResetTargetInfo) {
  console.warn("Database reset target:");
  console.warn(`  host: ${target.host}`);
  console.warn(`  port: ${target.port}`);
  console.warn(`  database: ${target.database}`);
  console.warn(`  user: ${target.user}`);
}

function isInteractive() {
  return Boolean(input.isTTY && output.isTTY);
}

async function confirmReset(target: ResetTargetInfo) {
  if (!isInteractive()) return;

  const expected = `DROP ${target.database}`;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Type "${expected}" to reset database: `);
    if (answer !== expected) {
      throw new Error("Database reset confirmation did not match target database");
    }
  } finally {
    rl.close();
  }
}

export async function resetDb(env: ResetEnv = process.env) {
  loadEnv();

  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

  const target = parseResetTarget(connectionString);
  assertResetAllowed(env, target);
  printTarget(target);
  await confirmReset(target);

  const directUrl = env.DATABASE_DIRECT_URL || connectionString;
  const client = postgres(directUrl, { max: 1 });
  try {
    console.warn("Dropping and recreating public schema...");
    await client`DROP SCHEMA public CASCADE`;
    await client`CREATE SCHEMA public`;
    await client`GRANT ALL ON SCHEMA public TO public`;
    console.warn("Schema reset complete. Run db:push then db:seed.");
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  resetDb().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
