import { z } from 'zod';

const rawClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().trim().optional(),
  NEXT_PUBLIC_TIMEZONE: z.string().trim().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().trim().optional(),
  NEXT_PUBLIC_DEMO_MODE: z.string().trim().optional(),
  NEXT_PUBLIC_DEBUG: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_DISABLED: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_ORG: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_PROJECT: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_TRACING_ENABLED: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_REPLAY_ENABLED: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE: z.string().trim().optional(),
  NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE: z.string().trim().optional(),
  NEXT_PUBLIC_WEB_VITALS_ENDPOINT: z.string().trim().optional(),
  NEXT_PUBLIC_WEB_VITALS_ENABLED: z.string().trim().optional(),
  NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED: z.string().trim().optional(),
  NEXT_PUBLIC_PERFORMANCE_METRICS_ENDPOINT: z.string().trim().optional(),
});

const rawEnv = rawClientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_TIMEZONE: process.env.NEXT_PUBLIC_TIMEZONE,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DISABLED: process.env.NEXT_PUBLIC_SENTRY_DISABLED,
  NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
  NEXT_PUBLIC_SENTRY_PROJECT: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
  NEXT_PUBLIC_SENTRY_TRACING_ENABLED: process.env.NEXT_PUBLIC_SENTRY_TRACING_ENABLED,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_REPLAY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_REPLAY_ENABLED,
  NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
  NEXT_PUBLIC_WEB_VITALS_ENDPOINT: process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT,
  NEXT_PUBLIC_WEB_VITALS_ENABLED: process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED,
  NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED:
    process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED,
  NEXT_PUBLIC_PERFORMANCE_METRICS_ENDPOINT:
    process.env.NEXT_PUBLIC_PERFORMANCE_METRICS_ENDPOINT,
});

export type AppEnv = 'dev' | 'prod';

function parseBooleanEnv(
  name: string,
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined || value === '') return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  throw new Error(`${name} must be one of: true/false/1/0/yes/no/on/off`);
}

function parseNumberEnv(
  name: string,
  value: string | undefined,
  defaultValue: number
): number {
  if (value === undefined || value === '') return defaultValue;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number`);
  }

  return parsed;
}

function parseUnitIntervalEnv(
  name: string,
  value: string | undefined,
  defaultValue: number
): number {
  const parsed = parseNumberEnv(name, value, defaultValue);
  if (parsed < 0 || parsed > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }

  return parsed;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) return '/api';
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '') || '/';
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be an absolute URL or a root-relative path like /api'
    );
  }
}

function normalizeOptionalUrlOrPath(name: string, value: string | undefined): string | undefined {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

const appEnv: AppEnv = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

export const envClient = Object.freeze({
  appEnv,
  isDevAppEnv: appEnv === 'dev',
  isProdAppEnv: appEnv === 'prod',
  apiBaseUrl: normalizeApiBaseUrl(rawEnv.NEXT_PUBLIC_API_URL),
  googleClientId: normalizeOptionalString(rawEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  demoMode: normalizeOptionalString(rawEnv.NEXT_PUBLIC_DEMO_MODE),
  debug: normalizeOptionalString(rawEnv.NEXT_PUBLIC_DEBUG),
  sentryDsn: normalizeOptionalString(rawEnv.NEXT_PUBLIC_SENTRY_DSN),
  sentryOrg: normalizeOptionalString(rawEnv.NEXT_PUBLIC_SENTRY_ORG),
  sentryProject: normalizeOptionalString(rawEnv.NEXT_PUBLIC_SENTRY_PROJECT),
  sentryDisabled: parseBooleanEnv(
    'NEXT_PUBLIC_SENTRY_DISABLED',
    rawEnv.NEXT_PUBLIC_SENTRY_DISABLED,
    false
  ),
  sentryTracingEnabled: parseBooleanEnv(
    'NEXT_PUBLIC_SENTRY_TRACING_ENABLED',
    rawEnv.NEXT_PUBLIC_SENTRY_TRACING_ENABLED,
    false
  ),
  sentryTracesSampleRate: parseUnitIntervalEnv(
    'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE',
    rawEnv.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    0.1
  ),
  sentryReplayEnabled: parseBooleanEnv(
    'NEXT_PUBLIC_SENTRY_REPLAY_ENABLED',
    rawEnv.NEXT_PUBLIC_SENTRY_REPLAY_ENABLED,
    false
  ),
  sentryReplaySessionSampleRate: parseUnitIntervalEnv(
    'NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE',
    rawEnv.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
    0.1
  ),
  sentryReplayOnErrorSampleRate: parseUnitIntervalEnv(
    'NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE',
    rawEnv.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
    1
  ),
  webVitalsEndpoint: normalizeOptionalUrlOrPath(
    'NEXT_PUBLIC_WEB_VITALS_ENDPOINT',
    rawEnv.NEXT_PUBLIC_WEB_VITALS_ENDPOINT
  ),
  webVitalsEnabled: parseBooleanEnv(
    'NEXT_PUBLIC_WEB_VITALS_ENABLED',
    rawEnv.NEXT_PUBLIC_WEB_VITALS_ENABLED,
    false
  ),
  performanceMonitoringEnabled: parseBooleanEnv(
    'NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED',
    rawEnv.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED,
    false
  ),
  performanceMetricsEndpoint: normalizeOptionalUrlOrPath(
    'NEXT_PUBLIC_PERFORMANCE_METRICS_ENDPOINT',
    rawEnv.NEXT_PUBLIC_PERFORMANCE_METRICS_ENDPOINT
  ),
  attendanceAllowImageUpload: appEnv === 'dev',
});
