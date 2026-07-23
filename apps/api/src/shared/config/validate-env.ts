type Env = Record<string, string | undefined>;

const INSECURE_DEFAULTS = new Set([
  "change_me", "changeme", "change-me", "change_me_in_prod",
  "changeit", "admin", "admin123", "administrator",
  "password", "password123", "passw0rd", "p@ssw0rd",
  "secret", "secret_key", "secretkey", "supersecret",
  "default", "test", "test123", "example", "examplekey",
  "root", "toor", "minioadmin", "postgres", "hrms",
  "hrms_secret", "redis", "guest", "user", "demo", "dev",
  "development", "qwerty", "123456", "1234567", "12345678",
  "letmein", "welcome", "welcome123", "iloveyou",
  "null", "undefined", "none", "todo", "tbd",
  "placeholder", "__set_via_vault__",
]);

const INSECURE_SUBSTRINGS = [
  "change_me", "changeme", "change-me", "placeholder",
  "set_via_vault", "set-via-vault",
  "your_secret", "your-secret", "yoursecret",
  "replace_me", "replaceme", "todo", "fixme", "example",
];

const KNOWN_COMPROMISED = new Set([
  "vwOYdY15w5KFoZjGrnxf6KskmkW4xZVzHnNfWtiZtqo=",
  "vwOYdY15w5KFoZjdrnxf6KskmkW4xZVzHnNfWtiZtqo-",
  "minioadmin",
  "hrms_secret",
]);

function assertSecretStrength(value: string, label: string, minLength: number) {
  const trimmed = String(value).trim();
  if (!trimmed) throw new Error(`${label} must not be empty`);

  const lower = trimmed.toLowerCase();
  if (INSECURE_DEFAULTS.has(lower)) {
    throw new Error(`${label} is a known insecure default ("${trimmed}"). Generate a strong random value.`);
  }
  for (const needle of INSECURE_SUBSTRINGS) {
    if (lower.includes(needle)) {
      throw new Error(`${label} contains insecure placeholder "${needle}". Provide a real secret.`);
    }
  }
  if (KNOWN_COMPROMISED.has(trimmed)) {
    throw new Error(`${label} is a known-compromised value. Rotate immediately.`);
  }
  if (trimmed.length < minLength) {
    throw new Error(`${label} must be at least ${minLength} characters (got ${trimmed.length}).`);
  }
}

function validateBoolean(value: string, label: string) {
  const norm = String(value).trim().toLowerCase();
  if (!["true", "false", "1", "0", "yes", "no"].includes(norm)) {
    throw new Error(`${label} must be a boolean-like value: true/false/1/0/yes/no`);
  }
}

function validateUrl(value: string, label: string, protocols?: string[]) {
  try {
    const parsed = new URL(value);
    if (protocols && !protocols.includes(parsed.protocol)) {
      throw new Error(`${label} must use one of: ${protocols.join(", ")}`);
    }
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
}

export function validateEnv(config: Env) {
  const nodeEnv = String(config.NODE_ENV || "").toLowerCase();
  const isProduction = nodeEnv === "production";
  const storageBackend = String(config.STORAGE_BACKEND || "").toLowerCase();

  // ── Required vars ─────────────────────────────────────────────
  const required = [
    "DATABASE_URL",
    "AUTH_JWT_SECRET",
    "AUTH_JWT_REFRESH_SECRET",
    "APP_URL",
    "AUTH_DEFAULT_PASSWORD",
    ...(isProduction && storageBackend === "s3" ? ["STORAGE_S3_URL"] : []),
  ];
  const missing = required.filter((k) => !config[k] || !String(config[k]).trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // ── Secret strength checks ────────────────────────────────────
  assertSecretStrength(config.AUTH_JWT_SECRET as string, "AUTH_JWT_SECRET", 32);
  if (config.AUTH_JWT_REFRESH_SECRET) {
    assertSecretStrength(config.AUTH_JWT_REFRESH_SECRET, "AUTH_JWT_REFRESH_SECRET", 32);
  }
  if (config.AUTH_JWT_REFRESH_SECRET && config.AUTH_JWT_SECRET === config.AUTH_JWT_REFRESH_SECRET) {
    throw new Error("AUTH_JWT_SECRET and AUTH_JWT_REFRESH_SECRET must be different values");
  }
  if (config.AUTH_DEFAULT_PASSWORD) {
    assertSecretStrength(config.AUTH_DEFAULT_PASSWORD, "AUTH_DEFAULT_PASSWORD", 12);
  }

  // ── Storage ───────────────────────────────────────────────────
  if (storageBackend && !["local", "s3"].includes(storageBackend)) {
    throw new Error("STORAGE_BACKEND must be 'local' or 's3'");
  }
  if (config.STORAGE_S3_URL) {
    validateUrl(config.STORAGE_S3_URL, "STORAGE_S3_URL", ["http:", "https:"]);
  }
  if (config.STORAGE_SIGNED_URL_TTL_SEC && Number.isNaN(Number(config.STORAGE_SIGNED_URL_TTL_SEC))) {
    throw new Error("STORAGE_SIGNED_URL_TTL_SEC must be a number");
  }

  // ── URLs (prefixed based) ─────────────────────────────────────
  if (config.REDIS_URL) validateUrl(config.REDIS_URL, "REDIS_URL", ["redis:", "rediss:"]);
  if (config.APP_URL) validateUrl(config.APP_URL, "APP_URL", ["http:", "https:"]);
  if (config.OBSERVABILITY_OTEL_URL) {
    validateUrl(config.OBSERVABILITY_OTEL_URL, "OBSERVABILITY_OTEL_URL", ["http:", "https:", "grpc:"]);
  }
  if (config.OBSERVABILITY_SENTRY_DSN) {
    validateUrl(config.OBSERVABILITY_SENTRY_DSN, "OBSERVABILITY_SENTRY_DSN", ["http:", "https:"]);
  }

  // ── Observability ─────────────────────────────────────────────
  if (config.OBSERVABILITY_SENTRY_TRACES_SAMPLE_RATE) {
    const n = Number(config.OBSERVABILITY_SENTRY_TRACES_SAMPLE_RATE);
    if (Number.isNaN(n) || n < 0 || n > 1) {
      throw new Error("OBSERVABILITY_SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1");
    }
  }

  // ── Auth / Cookie ─────────────────────────────────────────────
  if (config.AUTH_COOKIE_SECURE) validateBoolean(config.AUTH_COOKIE_SECURE, "AUTH_COOKIE_SECURE");
  if (config.AUTH_BCRYPT_ROUNDS !== undefined) {
    const n = Number(config.AUTH_BCRYPT_ROUNDS);
    if (!Number.isInteger(n) || n < 10 || n > 16) {
      throw new Error("AUTH_BCRYPT_ROUNDS must be an integer between 10 and 16");
    }
  }
  if (config.AUTH_REFRESH_TOKEN_CLEANUP_ENABLED) {
    validateBoolean(config.AUTH_REFRESH_TOKEN_CLEANUP_ENABLED, "AUTH_REFRESH_TOKEN_CLEANUP_ENABLED");
  }
  if (config.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS && Number.isNaN(Number(config.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS))) {
    throw new Error("AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS must be a number");
  }

  // ── Webhooks ──────────────────────────────────────────────────
  if (config.WEBHOOK_SECRET && !String(config.WEBHOOK_SECRET).trim()) {
    throw new Error("WEBHOOK_SECRET must not be empty when set");
  }
  if (config.WEBHOOK_DELIVERY_TIMEOUT_MS && Number.isNaN(Number(config.WEBHOOK_DELIVERY_TIMEOUT_MS))) {
    throw new Error("WEBHOOK_DELIVERY_TIMEOUT_MS must be a number");
  }
  if (config.WEBHOOK_ALLOW_INSECURE_HTTP) {
    validateBoolean(config.WEBHOOK_ALLOW_INSECURE_HTTP, "WEBHOOK_ALLOW_INSECURE_HTTP");
  }
  if (config.WEBHOOK_TARGET_ALLOWLIST) {
    const parts = String(config.WEBHOOK_TARGET_ALLOWLIST).split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) throw new Error("WEBHOOK_TARGET_ALLOWLIST must contain at least one hostname when set");
  }

  // ── Vault ─────────────────────────────────────────────────────
  if (isProduction && String(config.FEATURE_VAULT || "").toLowerCase() === "true" && !String(config.VAULT_TOKEN || "").trim()) {
    throw new Error("VAULT_TOKEN is required when FEATURE_VAULT=true in production");
  }
  if (config.VAULT_ADDR) validateUrl(config.VAULT_ADDR, "VAULT_ADDR", ["http:", "https:"]);

  // ── Feature flags ─────────────────────────────────────────────
  for (const key of ["FEATURE_SWAGGER", "FEATURE_DB_VERIFY", "FEATURE_VAULT", "FEATURE_REDIS_EVENT_BUS"]) {
    if (config[key]) validateBoolean(config[key], key);
  }

  // ── Numeric ───────────────────────────────────────────────────
  if (config.UPLOAD_MAX_MB && Number.isNaN(Number(config.UPLOAD_MAX_MB))) {
    throw new Error("UPLOAD_MAX_MB must be a number");
  }
  if (config.MAX_REQUEST_BODY_KB && Number.isNaN(Number(config.MAX_REQUEST_BODY_KB))) {
    throw new Error("MAX_REQUEST_BODY_KB must be a number");
  }
  if (config.OUTBOX_MAX_CONCURRENT_PER_TYPE && Number.isNaN(Number(config.OUTBOX_MAX_CONCURRENT_PER_TYPE))) {
    throw new Error("OUTBOX_MAX_CONCURRENT_PER_TYPE must be a number");
  }

  // ── Trust proxy ───────────────────────────────────────────────
  if (config.TRUST_PROXY) {
    const val = String(config.TRUST_PROXY).trim().toLowerCase();
    const num = Number(val);
    const isNum = Number.isInteger(num) && num >= 0;
    const isBool = ["true", "false"].includes(val);
    if (!isNum && !isBool) throw new Error("TRUST_PROXY must be true, false, or a non-negative integer");
  }

  // ── Production-only safety checks ────────────────────────────
  if (isProduction) {
    // ALLOW_DB_RESET is still checked at runtime by reset.ts guard
    if (String(config.ALLOW_REMOTE_DB_RESET || "false").toLowerCase() === "true") {
      throw new Error("ALLOW_REMOTE_DB_RESET must be false in production");
    }
  }

  return config;
}
