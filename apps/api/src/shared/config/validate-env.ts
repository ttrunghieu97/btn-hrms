import { isValidTrustedProxyEntry } from "../utils/cookie-csrf.util";

type Env = Record<string, string | undefined>;

const INSECURE_SUBSTRINGS = ["123"];

function assertSecretStrength(value: string, label: string, minLength: number) {
  const trimmed = String(value).trim();
  if (!trimmed) throw new Error(`${label} must not be empty`);
  if (trimmed.length < minLength) {
    throw new Error(`${label} must be at least ${minLength} characters (got ${trimmed.length}).`);
  }

  const lower = trimmed.toLowerCase();
  for (const needle of INSECURE_SUBSTRINGS) {
    if (lower.includes(needle)) {
      throw new Error(`${label} contains insecure placeholder "${needle}". Provide a real secret.`);
    }
  }
}

function validateBoolean(value: string, label: string) {
  const norm = String(value).trim().toLowerCase();
  if (!["true", "false", "1", "0", "yes", "no"].includes(norm)) {
    throw new Error(`${label} must be a boolean-like value: true/false/1/0/yes/no`);
  }
}

function validateUrl(value: string, label: string, protocols?: string[]) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (protocols && !protocols.includes(parsed.protocol)) {
    throw new Error(`${label} must use one of: ${protocols.join(", ")}`);
  }
}

function validateNumber(value: string, label: string, opts?: { min?: number; max?: number; integer?: boolean }) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    throw new Error(`${label} must be a number`);
  }
  if (opts?.integer && !Number.isInteger(n)) {
    throw new Error(`${label} must be an integer`);
  }
  if (opts?.min !== undefined && n < opts.min) {
    throw new Error(`${label} must be >= ${opts.min}`);
  }
  if (opts?.max !== undefined && n > opts.max) {
    throw new Error(`${label} must be <= ${opts.max}`);
  }
}

function validateTimezone(value: string, label: string) {
  const tz = String(value).trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error(`${label} must be a valid IANA timezone (got "${tz}")`);
  }
}

export function validateEnv(config: Env) {
  const nodeEnv = String(config.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv && !["development", "production", "test"].includes(nodeEnv)) {
    throw new Error("NODE_ENV must be one of: development, production, test");
  }
  const isProduction = nodeEnv === "production";
  const storageBackend = String(config.STORAGE_BACKEND || "").toLowerCase();

  // ── Runtime host / port / timezone ────────────────────────────
  if (config.PORT) {
    validateNumber(config.PORT, "PORT", { integer: true, min: 1, max: 65535 });
  }
  if (config.HOST !== undefined && !String(config.HOST).trim()) {
    throw new Error("HOST must not be empty when set");
  }
  if (config.APP_TIMEZONE) validateTimezone(config.APP_TIMEZONE, "APP_TIMEZONE");
  if (config.TZ) validateTimezone(config.TZ, "TZ");

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

  // ── Database URLs ─────────────────────────────────────────────
  if (config.DATABASE_URL) {
    validateUrl(config.DATABASE_URL, "DATABASE_URL", ["postgres:", "postgresql:"]);
  }
  if (config.DATABASE_DIRECT_URL) {
    validateUrl(config.DATABASE_DIRECT_URL, "DATABASE_DIRECT_URL", ["postgres:", "postgresql:"]);
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
  if (config.TOTP_ENCRYPTION_KEY) {
    assertSecretStrength(config.TOTP_ENCRYPTION_KEY, "TOTP_ENCRYPTION_KEY", 32);
  }

  // ── PII Encryption ────────────────────────────────────────────
  const loadedPiiVersions = new Set<number>();
  if (config.PII_ENCRYPTION_KEY) {
    if (String(config.PII_ENCRYPTION_KEY).trim().length < 32) {
      throw new Error("PII_ENCRYPTION_KEY must be at least 32 characters");
    }
    if (isProduction) {
      assertSecretStrength(config.PII_ENCRYPTION_KEY, "PII_ENCRYPTION_KEY", 32);
    }
    loadedPiiVersions.add(1);
  }
  for (let v = 1; v <= 10; v++) {
    const keyName = `PII_ENCRYPTION_KEY_V${v}`;
    const keyVal = config[keyName];
    if (keyVal) {
      if (String(keyVal).trim().length < 32) {
        throw new Error(`${keyName} must be at least 32 characters`);
      }
      if (isProduction) {
        assertSecretStrength(keyVal, keyName, 32);
      }
      loadedPiiVersions.add(v);
    }
  }
  if (isProduction && loadedPiiVersions.size === 0) {
    throw new Error(
      "Missing required environment variables: PII_ENCRYPTION_KEY (or PII_ENCRYPTION_KEY_V1..V10)",
    );
  }
  if (config.PII_ENCRYPTION_ACTIVE_VERSION) {
    validateNumber(config.PII_ENCRYPTION_ACTIVE_VERSION, "PII_ENCRYPTION_ACTIVE_VERSION", {
      integer: true,
      min: 1,
      max: 10,
    });
    const activeVer = Number(config.PII_ENCRYPTION_ACTIVE_VERSION);
    if (loadedPiiVersions.size > 0 && !loadedPiiVersions.has(activeVer)) {
      throw new Error(
        `PII_ENCRYPTION_ACTIVE_VERSION=${activeVer} requires PII_ENCRYPTION_KEY_V${activeVer} (or PII_ENCRYPTION_KEY for v1) to be set`,
      );
    }
  }

  // ── Storage ───────────────────────────────────────────────────
  if (storageBackend && !["local", "s3"].includes(storageBackend)) {
    throw new Error("STORAGE_BACKEND must be 'local' or 's3'");
  }
  if (config.STORAGE_S3_URL) {
    validateUrl(config.STORAGE_S3_URL, "STORAGE_S3_URL", ["http:", "https:"]);
  }
  if (config.STORAGE_S3_PUBLIC_ENDPOINT) {
    validateUrl(config.STORAGE_S3_PUBLIC_ENDPOINT, "STORAGE_S3_PUBLIC_ENDPOINT", ["http:", "https:"]);
  }
  if (config.STORAGE_PUBLIC_CDN_ENABLED) {
    validateBoolean(config.STORAGE_PUBLIC_CDN_ENABLED, "STORAGE_PUBLIC_CDN_ENABLED");
  }
  if (config.STORAGE_S3_FORCE_PATH_STYLE) {
    validateBoolean(config.STORAGE_S3_FORCE_PATH_STYLE, "STORAGE_S3_FORCE_PATH_STYLE");
  }
  if (config.STORAGE_SIGNED_URL_TTL_SEC) {
    validateNumber(config.STORAGE_SIGNED_URL_TTL_SEC, "STORAGE_SIGNED_URL_TTL_SEC", { min: 1 });
  }
  if (config.STORAGE_FINALIZE_RETRY_INTERVAL_MS) {
    validateNumber(config.STORAGE_FINALIZE_RETRY_INTERVAL_MS, "STORAGE_FINALIZE_RETRY_INTERVAL_MS", { min: 1 });
  }

  // ── ClamAV / Virus Scanning ───────────────────────────────────
  if (config.CLAMAV_ENABLED) validateBoolean(config.CLAMAV_ENABLED, "CLAMAV_ENABLED");
  if (config.CLAMAV_FAIL_CLOSED) validateBoolean(config.CLAMAV_FAIL_CLOSED, "CLAMAV_FAIL_CLOSED");
  if (config.CLAMAV_PORT) {
    validateNumber(config.CLAMAV_PORT, "CLAMAV_PORT", { integer: true, min: 1, max: 65535 });
  }
  if (config.CLAMAV_TIMEOUT_MS) {
    validateNumber(config.CLAMAV_TIMEOUT_MS, "CLAMAV_TIMEOUT_MS", { min: 1 });
  }
  if (config.SCAN_QUEUE_INTERVAL_MS) {
    validateNumber(config.SCAN_QUEUE_INTERVAL_MS, "SCAN_QUEUE_INTERVAL_MS", { min: 1 });
  }

  // ── URLs (prefixed based) ─────────────────────────────────────
  if (config.REDIS_URL) validateUrl(config.REDIS_URL, "REDIS_URL", ["redis:", "rediss:"]);
  for (const originKey of ["APP_URL", "FRONTEND_URL", "CORS_ORIGIN"] as const) {
    const rawOrigin = config[originKey];
    if (rawOrigin) {
      for (const url of String(rawOrigin)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => Boolean(s) && s !== "*")) {
        validateUrl(url, originKey, ["http:", "https:"]);
      }
    }
  }
  if (config.OBSERVABILITY_OTEL_URL) {
    validateUrl(config.OBSERVABILITY_OTEL_URL, "OBSERVABILITY_OTEL_URL", [
      "http:",
      "https:",
      "grpc:",
    ]);
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
  if (
    config.OBSERVABILITY_OTEL_SERVICE_NAME !== undefined &&
    !String(config.OBSERVABILITY_OTEL_SERVICE_NAME).trim()
  ) {
    throw new Error("OBSERVABILITY_OTEL_SERVICE_NAME must not be empty when set");
  }

  // ── Auth / Cookie ─────────────────────────────────────────────
  if (config.AUTH_COOKIE_SECURE) validateBoolean(config.AUTH_COOKIE_SECURE, "AUTH_COOKIE_SECURE");
  if (config.AUTH_COOKIE_SAMESITE) {
    const sameSite = String(config.AUTH_COOKIE_SAMESITE).trim().toLowerCase();
    if (!["lax", "strict", "none"].includes(sameSite)) {
      throw new Error("AUTH_COOKIE_SAMESITE must be one of: lax, strict, none");
    }
  }
  if (config.AUTH_JWT_ACCESS_EXPIRES_IN) {
    if (!/^\d+(s|m|h|d)$/.test(String(config.AUTH_JWT_ACCESS_EXPIRES_IN).trim())) {
      throw new Error("AUTH_JWT_ACCESS_EXPIRES_IN must match format <number><s|m|h|d> (e.g. 15m, 1h)");
    }
  }
  if (config.REFRESH_GRACE_PERIOD_MS) {
    validateNumber(config.REFRESH_GRACE_PERIOD_MS, "REFRESH_GRACE_PERIOD_MS", { min: 0 });
  }
  if (config.AUTH_BCRYPT_ROUNDS !== undefined) {
    const n = Number(config.AUTH_BCRYPT_ROUNDS);
    if (!Number.isInteger(n) || n < 10 || n > 16) {
      throw new Error("AUTH_BCRYPT_ROUNDS must be an integer between 10 and 16");
    }
  }
  if (config.AUTH_REFRESH_TOKEN_CLEANUP_ENABLED) {
    validateBoolean(
      config.AUTH_REFRESH_TOKEN_CLEANUP_ENABLED,
      "AUTH_REFRESH_TOKEN_CLEANUP_ENABLED",
    );
  }
  if (config.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS) {
    validateNumber(
      config.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS,
      "AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS",
      { min: 1 },
    );
  }

  // ── Webhooks ──────────────────────────────────────────────────
  if (config.WEBHOOK_SECRET && !String(config.WEBHOOK_SECRET).trim()) {
    throw new Error("WEBHOOK_SECRET must not be empty when set");
  }
  if (config.WEBHOOK_DELIVERY_TIMEOUT_MS) {
    validateNumber(config.WEBHOOK_DELIVERY_TIMEOUT_MS, "WEBHOOK_DELIVERY_TIMEOUT_MS", { min: 1 });
  }
  if (config.WEBHOOK_ALLOW_INSECURE_HTTP) {
    validateBoolean(config.WEBHOOK_ALLOW_INSECURE_HTTP, "WEBHOOK_ALLOW_INSECURE_HTTP");
  }
  if (config.WEBHOOK_TARGET_ALLOWLIST) {
    const parts = String(config.WEBHOOK_TARGET_ALLOWLIST)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length)
      throw new Error("WEBHOOK_TARGET_ALLOWLIST must contain at least one hostname when set");
  }

  // ── Vault ─────────────────────────────────────────────────────
  if (
    isProduction &&
    String(config.FEATURE_VAULT || "").toLowerCase() === "true" &&
    !String(config.VAULT_TOKEN || "").trim()
  ) {
    throw new Error("VAULT_TOKEN is required when FEATURE_VAULT=true in production");
  }
  if (config.VAULT_ADDR) validateUrl(config.VAULT_ADDR, "VAULT_ADDR", ["http:", "https:"]);

  // ── Feature flags & Attendance policy ─────────────────────────
  for (const key of [
    "FEATURE_SWAGGER",
    "FEATURE_DB_VERIFY",
    "FEATURE_VAULT",
    "FEATURE_REDIS_EVENT_BUS",
    "ATTENDANCE_STRICT_FACE_DETECTION",
    "ALLOW_DB_RESET",
    "ALLOW_REMOTE_DB_RESET",
  ]) {
    if (config[key]) validateBoolean(config[key], key);
  }
  if (config.ATTENDANCE_FACE_VERIFICATION_MODE) {
    const mode = String(config.ATTENDANCE_FACE_VERIFICATION_MODE).trim().toLowerCase();
    if (!["flagged", "strict", "permissive", "verified"].includes(mode)) {
      throw new Error(
        "ATTENDANCE_FACE_VERIFICATION_MODE must be one of: flagged, strict, permissive, verified",
      );
    }
  }
  if (
    isProduction &&
    String(config.FEATURE_REDIS_EVENT_BUS || "").toLowerCase() === "true" &&
    !String(config.REDIS_URL || "").trim()
  ) {
    throw new Error("REDIS_URL is required when FEATURE_REDIS_EVENT_BUS=true in production");
  }

  // ── Numeric & Event Bus / Cache / Upload ──────────────────────
  for (const numKey of [
    "UPLOAD_MAX_MB",
    "UPLOAD_MULTIPART_MAX_BYTES",
    "MAX_REQUEST_BODY_KB",
    "OUTBOX_MAX_CONCURRENT_PER_TYPE",
    "EVENT_BUS_STREAM_MAXLEN",
    "EVENT_BUS_MAX_RETRIES",
    "EVENT_BUS_RECLAIM_IDLE_MS",
    "EVENT_BUS_RECLAIM_COUNT",
    "PERMISSIONS_CACHE_TTL",
    "PERMISSIONS_CACHE_MAX",
    "TASK_REMINDER_INTERVAL_MS",
  ] as const) {
    if (config[numKey]) {
      validateNumber(config[numKey], numKey, { min: 1 });
    }
  }

  // ── Trust proxy ───────────────────────────────────────────────
  if (config.TRUST_PROXY) {
    const val = String(config.TRUST_PROXY).trim().toLowerCase();
    const num = Number(val);
    const isNum = Number.isInteger(num) && num >= 0;
    const isBool = ["true", "false"].includes(val);
    if (!isNum && !isBool)
      throw new Error("TRUST_PROXY must be true, false, or a non-negative integer");
  }
  if (config.TRUSTED_PROXY_IPS) {
    const entries = String(config.TRUSTED_PROXY_IPS)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!entries.length || entries.some((entry) => !isValidTrustedProxyEntry(entry))) {
      throw new Error(
        "TRUSTED_PROXY_IPS must be a comma-separated list of valid IPs, CIDRs, or loopback/linklocal/uniquelocal",
      );
    }
  }

  // ── Production-only safety checks ────────────────────────────
  if (isProduction) {
    if (String(config.ALLOW_DB_RESET || "false").toLowerCase() === "true") {
      throw new Error("ALLOW_DB_RESET must be false in production");
    }
    if (String(config.ALLOW_REMOTE_DB_RESET || "false").toLowerCase() === "true") {
      throw new Error("ALLOW_REMOTE_DB_RESET must be false in production");
    }
  }

  return config;
}
