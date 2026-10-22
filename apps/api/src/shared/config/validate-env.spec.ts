import { validateEnv } from "./validate-env";

describe("validateEnv", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://localhost:5432/hrms",
    AUTH_JWT_SECRET: "jwt_secret_with_adequate_length_to_pass_validation_of_32_chars",
    AUTH_JWT_REFRESH_SECRET: "jwt_refresh_secret_with_adequate_length_to_pass_validation_of_32_chars",
    APP_URL: "http://localhost:5173",
    AUTH_DEFAULT_PASSWORD: "TestDev2025!Secure",
    PII_ENCRYPTION_KEY: "pii_encryption_key_with_adequate_length_32_chars",
  };

  it("requires AUTH_JWT_REFRESH_SECRET", () => {
    const env = { ...baseEnv };
    delete (env as any).AUTH_JWT_REFRESH_SECRET;
    expect(() => validateEnv(env)).toThrow(
      /Missing required environment variables: AUTH_JWT_REFRESH_SECRET/,
    );
  });

  it("requires runtime auth, CORS, and employee credential settings in development", () => {
    const requiredKeys = [
      "AUTH_JWT_REFRESH_SECRET",
      "APP_URL",
      "AUTH_DEFAULT_PASSWORD",
    ] as const;

    for (const key of requiredKeys) {
      const env = { ...baseEnv, NODE_ENV: "development" };
      delete env[key];
      expect(() => validateEnv(env)).toThrow(
        new RegExp(`Missing required environment variables: ${key}`),
      );
    }
  });

  it("rejects a weak default employee password", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        AUTH_DEFAULT_PASSWORD: "Btn123@",
      }),
    ).toThrow(/AUTH_DEFAULT_PASSWORD must be at least 12 characters/);
  });

  it("rejects a 12+ character password containing an insecure placeholder", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        AUTH_DEFAULT_PASSWORD: "Password123!LongEnough",
      }),
    ).toThrow(/AUTH_DEFAULT_PASSWORD contains insecure placeholder "123"/);
  });

  it("accepts comma-separated APP_URL values", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        APP_URL: "http://localhost:3000, https://hrms.company.local",
      }),
    ).not.toThrow();
  });

  it("rejects invalid TRUST_PROXY", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        TRUST_PROXY: "invalid",
      }),
    ).toThrow(/TRUST_PROXY must be true, false, or a non-negative integer/);
  });

  it("accepts valid TRUSTED_PROXY_IPS and rejects invalid entries", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        TRUSTED_PROXY_IPS: "loopback, 172.18.0.0/16, 10.0.0.5",
      }),
    ).not.toThrow();

    expect(() =>
      validateEnv({
        ...baseEnv,
        TRUSTED_PROXY_IPS: "loopback, invalid-proxy-host",
      }),
    ).toThrow(/TRUSTED_PROXY_IPS/);
  });

  it("requires durable infra URLs in production profile", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://hrms:pass@postgres:5432/hrms",
      REDIS_URL: "redis://:pass@redis-cache:6379/0",
      STORAGE_BACKEND: "s3",
      STORAGE_S3_URL: "http://svc-files:secret@minio.example.com?region=us-east-1",
    };

    expect(() => validateEnv(input)).not.toThrow();
  });

  it("allows dev profile to omit optional infra", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "development",
      DATABASE_URL: "postgres://hrms:pass@localhost:6432/hrms",
    };

    expect(() => validateEnv(input)).not.toThrow();
  });

  it("allows dev S3 profile to omit storage credentials", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "development",
      DATABASE_URL: "postgres://hrms:pass@localhost:6432/hrms",
      STORAGE_BACKEND: "s3",
    };

    expect(() => validateEnv(input)).not.toThrow();
  });

  it("rejects production S3 profile when STORAGE_S3_URL is missing", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://hrms:pass@postgres:5432/hrms",
      REDIS_URL: "redis://:pass@redis-cache:6379/0",
      STORAGE_BACKEND: "s3",
    };

    expect(() => validateEnv(input)).toThrow(/STORAGE_S3_URL/);
  });

  it("accepts boolean-like feature flags", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        FEATURE_SWAGGER: "false",
        FEATURE_DB_VERIFY: "yes",
      }),
    ).not.toThrow();
  });

  it("requires VAULT_TOKEN when FEATURE_VAULT is true in production", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://hrms:pass@postgres:5432/hrms",
      REDIS_URL: "redis://:pass@redis-cache:6379/0",
      STORAGE_BACKEND: "local",
      FEATURE_VAULT: "true",
    };

    expect(() => validateEnv(input)).toThrow(/VAULT_TOKEN/);
  });

  it("rejects ALLOW_REMOTE_DB_RESET=true in production", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://hrms:pass@postgres:5432/hrms",
      REDIS_URL: "redis://:pass@redis-cache:6379/0",
      ALLOW_REMOTE_DB_RESET: "true",
    };

    expect(() => validateEnv(input)).toThrow(/ALLOW_REMOTE_DB_RESET/);
  });

  it("rejects ALLOW_DB_RESET=true in production", () => {
    const input = {
      ...baseEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://hrms:pass@postgres:5432/hrms",
      ALLOW_DB_RESET: "true",
    };

    expect(() => validateEnv(input)).toThrow(/ALLOW_DB_RESET must be false in production/);
  });

  it("requires PII_ENCRYPTION_KEY (or PII_ENCRYPTION_KEY_V*) in production and validates key length", () => {
    const missingPii: Record<string, string | undefined> = {
      ...baseEnv,
      NODE_ENV: "production",
    };
    delete missingPii.PII_ENCRYPTION_KEY;
    expect(() => validateEnv(missingPii)).toThrow(/PII_ENCRYPTION_KEY/);

    expect(() =>
      validateEnv({
        ...baseEnv,
        PII_ENCRYPTION_KEY: "too-short",
      }),
    ).toThrow(/PII_ENCRYPTION_KEY must be at least 32 characters/);

    expect(() =>
      validateEnv({
        ...baseEnv,
        PII_ENCRYPTION_ACTIVE_VERSION: "2",
      }),
    ).toThrow(/PII_ENCRYPTION_ACTIVE_VERSION=2 requires PII_ENCRYPTION_KEY_V2/);
  });

  it("validates PORT, APP_TIMEZONE, DATABASE_URL protocol, cookie SameSite, and attendance mode", () => {
    expect(() => validateEnv({ ...baseEnv, PORT: "70000" })).toThrow(/PORT/);
    expect(() => validateEnv({ ...baseEnv, APP_TIMEZONE: "Invalid/Zone" })).toThrow(
      /APP_TIMEZONE must be a valid IANA timezone/,
    );
    expect(() =>
      validateEnv({ ...baseEnv, DATABASE_URL: "http://localhost:5432/hrms" }),
    ).toThrow(/DATABASE_URL must use one of: postgres:, postgresql:/);
    expect(() =>
      validateEnv({ ...baseEnv, AUTH_COOKIE_SAMESITE: "invalid" }),
    ).toThrow(/AUTH_COOKIE_SAMESITE/);
    expect(() =>
      validateEnv({ ...baseEnv, AUTH_JWT_ACCESS_EXPIRES_IN: "15minutes" }),
    ).toThrow(/AUTH_JWT_ACCESS_EXPIRES_IN/);
    expect(() =>
      validateEnv({ ...baseEnv, ATTENDANCE_FACE_VERIFICATION_MODE: "unknown" }),
    ).toThrow(/ATTENDANCE_FACE_VERIFICATION_MODE/);
  });

  it("requires REDIS_URL when FEATURE_REDIS_EVENT_BUS is true in production", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: "production",
        FEATURE_REDIS_EVENT_BUS: "true",
      }),
    ).toThrow(/REDIS_URL is required when FEATURE_REDIS_EVENT_BUS=true in production/);
  });
});
