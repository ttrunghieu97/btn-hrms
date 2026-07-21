import { validateEnv } from "./validate-env";

describe("validateEnv", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://localhost:5432/hrms",
    AUTH_JWT_SECRET: "jwt_secret_with_adequate_length_to_pass_validation_of_32_chars",
    AUTH_JWT_REFRESH_SECRET: "jwt_refresh_secret_with_adequate_length_to_pass_validation_of_32_chars",
    APP_URL: "http://localhost:5173",
    AUTH_DEFAULT_PASSWORD: "TestDev2025!Secure",
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

  it("rejects invalid TRUST_PROXY", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        TRUST_PROXY: "invalid",
      }),
    ).toThrow(/TRUST_PROXY must be true, false, or a non-negative integer/);
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
});
