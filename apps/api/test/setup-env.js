// Set required env vars for E2E tests (safe non-secret test placeholders)
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://hrms:postgres@127.0.0.1:5432/hrms";
process.env.REDIS_URL = process.env.REDIS_URL || "";
process.env.AUTH_JWT_SECRET =
  process.env.AUTH_JWT_SECRET || "e2e_test_jwt_access_secret_key_minimum_32_chars";
process.env.AUTH_JWT_REFRESH_SECRET =
  process.env.AUTH_JWT_REFRESH_SECRET || "e2e_test_jwt_refresh_secret_key_minimum_32_chars";
process.env.AUTH_DEFAULT_PASSWORD =
  process.env.AUTH_DEFAULT_PASSWORD || "E2eTestDefaultPass!@#";
process.env.PII_ENCRYPTION_KEY =
  process.env.PII_ENCRYPTION_KEY || "e2e_test_pii_encryption_key_minimum_32_chars";
process.env.APP_URL = process.env.APP_URL || "http://127.0.0.1:8080";
process.env.STORAGE_S3_URL =
  process.env.STORAGE_S3_URL || "http://minioadmin:minioadmin@127.0.0.1:9002?region=us-east-1&forcePathStyle=true";
process.env.STORAGE_BUCKET = process.env.STORAGE_BUCKET || "btn-hrms-test";
process.env.NODE_ENV = "test";
