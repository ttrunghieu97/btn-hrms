import {
  assertResetAllowed,
  parseResetTarget,
  type ResetTargetInfo,
} from "./reset";

const localTarget: ResetTargetInfo = {
  database: "hrms",
  host: "localhost",
  port: "5432",
  user: "hrms",
};

describe("database reset safety", () => {
  it("parses target database information", () => {
    expect(
      parseResetTarget("postgresql://hrms:secret@localhost:5433/hrms_dev"),
    ).toEqual({
      database: "hrms_dev",
      host: "localhost",
      port: "5433",
      user: "hrms",
    });
  });

  it("rejects production resets", () => {
    expect(() =>
      assertResetAllowed(
        { NODE_ENV: "production", ALLOW_DB_RESET: "true" },
        localTarget,
      ),
    ).toThrow("NODE_ENV=production");
  });

  it("requires explicit allow flag", () => {
    expect(() => assertResetAllowed({ NODE_ENV: "development" }, localTarget))
      .toThrow("ALLOW_DB_RESET=true");
  });

  it("rejects remote hosts by default", () => {
    expect(() =>
      assertResetAllowed(
        { NODE_ENV: "development", ALLOW_DB_RESET: "true" },
        { ...localTarget, host: "db.example.com" },
      ),
    ).toThrow("Refusing to reset remote database host db.example.com");
  });

  it("allows remote hosts with explicit override", () => {
    expect(() =>
      assertResetAllowed(
        {
          NODE_ENV: "development",
          ALLOW_DB_RESET: "true",
          ALLOW_REMOTE_DB_RESET: "true",
        },
        { ...localTarget, host: "db.example.com" },
      ),
    ).not.toThrow();
  });
});
