import { describe, it } from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const SCRIPT = resolve("scripts/deployment/restore-postgres.mjs");
const DUMMY_DUMP = resolve("scripts/deployment/.test_dummy.dump");

function runRestore(args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("restore-postgres.mjs safety safeguards", () => {
  it("fails closed when dump-file argument is missing", () => {
    const res = runRestore([]);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Usage: node scripts\/deployment\/restore-postgres.mjs/);
  });

  it("fails closed when DATABASE_RESTORE_URL is missing (even if DATABASE_URL is set)", () => {
    const res = runRestore(["some.dump"], {
      DATABASE_RESTORE_URL: "",
      DATABASE_URL: "postgresql://postgres:secret@localhost:5432/live_production_db",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /DATABASE_RESTORE_URL is not set/);
    assert.match(res.stderr, /Safety policy forbids automatic fallback to DATABASE_URL/);
  });

  it("fails closed when DATABASE_RESTORE_URL is invalid URL format", () => {
    const res = runRestore(["some.dump"], {
      DATABASE_RESTORE_URL: "invalid_not_a_url",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /not a valid URL format/);
  });

  it("fails closed when target database name does not match expected name", () => {
    const res = runRestore(["some.dump", "--target-db=intended_db"], {
      DATABASE_RESTORE_URL: "postgresql://postgres:secret@localhost:5432/accidental_db",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Target database mismatch/);
    assert.match(res.stderr, /DATABASE_RESTORE_URL points to 'accidental_db'/);
  });

  it("fails closed when DATABASE_RESTORE_URL is identical to active DATABASE_URL without bypass", () => {
    const dbUrl = "postgresql://postgres:secret@localhost:5432/live_production_db";
    const res = runRestore(["some.dump"], {
      DATABASE_RESTORE_URL: dbUrl,
      DATABASE_URL: dbUrl,
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /DATABASE_RESTORE_URL is IDENTICAL to active DATABASE_URL/);
    assert.match(res.stderr, /Overwriting the live running database is blocked by default/);
  });

  it("fails closed in production environment without explicit ALLOW_PRODUCTION_RESTORE=true", () => {
    const res = runRestore(["some.dump"], {
      NODE_ENV: "production",
      DATABASE_RESTORE_URL: "postgresql://postgres:secret@localhost:5432/staging_db",
      DATABASE_URL: "postgresql://postgres:secret@localhost:5432/prod_db",
      RESTORE_CONFIRM: "I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Running in a PRODUCTION environment/);
    assert.match(res.stderr, /Restores in production require explicit ALLOW_PRODUCTION_RESTORE=true/);
  });

  it("fails closed when confirmation token is missing", () => {
    const res = runRestore(["some.dump"], {
      DATABASE_RESTORE_URL: "postgresql://postgres:secret@localhost:5432/staging_db",
      DATABASE_URL: "postgresql://postgres:secret@localhost:5432/prod_db",
      RESTORE_CONFIRM: "",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Missing confirmation token/);
  });

  it("fails closed when dump file does not exist", () => {
    const res = runRestore(["non_existent_file.dump"], {
      DATABASE_RESTORE_URL: "postgresql://postgres:secret@localhost:5432/staging_db",
      DATABASE_URL: "postgresql://postgres:secret@localhost:5432/prod_db",
      RESTORE_CONFIRM: "I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE",
    });
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /Dump file not found/);
  });
});
