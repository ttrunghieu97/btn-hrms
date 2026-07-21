import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";
import dotenv from "dotenv";

if (fs.existsSync(".env")) {
  dotenv.config();
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

function splitStatements(sqlText) {
  return sqlText
    .split(/\n--> statement-breakpoint\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wrapCreateType(stmt) {
  const m = stmt.match(/^CREATE\s+TYPE\s+(.+?)\s+AS\s+ENUM\((.+)\);?$/s);
  if (!m) return stmt;
  const typeName = m[1];
  const enumValues = m[2];
  return `DO $$ BEGIN\n CREATE TYPE ${typeName} AS ENUM(${enumValues});\nEXCEPTION\n WHEN duplicate_object THEN null;\nEND $$;`;
}

function shouldIgnoreError(err) {
  const code = err?.code;
  return (
    code === "42710" || // duplicate_object
    code === "42P07" || // duplicate_table
    code === "42701" || // duplicate_column
    code === "42P06" || // duplicate_schema
    code === "23505" // unique_violation
  );
}

async function runIgnoringDuplicates(sql, stmt) {
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(stmt);
    });
  } catch (err) {
    if (!shouldIgnoreError(err)) throw err;
    // eslint-disable-next-line no-console
    console.warn(`ignore ${err.code}: ${String(err.message).split("\n")[0]}`);
  }
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const contents = fs.readFileSync(fullPath, "utf8");
    const hash = crypto.createHash("sha256").update(contents).digest("hex");

    const existing = await sql`select id from drizzle.__drizzle_migrations where hash = ${hash} limit 1`;
    if (existing.length) {
      // eslint-disable-next-line no-console
      console.log(`skip ${file}`);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`apply ${file}`);

    const statements = splitStatements(contents).map(wrapCreateType);

    for (const stmt of statements) {
      await runIgnoringDuplicates(sql, stmt);
    }

    await runIgnoringDuplicates(
      sql,
      `insert into drizzle.__drizzle_migrations (hash, created_at) values ('${hash}', (extract(epoch from now()) * 1000)::bigint)`,
    );

    // eslint-disable-next-line no-console
    console.log(`recorded ${file}`);
  }

  await sql.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
