// Set required env vars for E2E tests
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/btn_hrms_test";
process.env.REDIS_URL = process.env.REDIS_URL || "";
process.env.AUTH_JWT_SECRET = "e2e-test-jwt-secret-1234567890123456";
process.env.STORAGE_S3_URL = "http://minioadmin:minioadmin@localhost:9000";
process.env.STORAGE_BUCKET = "btn-hrms-test";
process.env.NODE_ENV = "test";
