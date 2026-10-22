/**
 * Centralized Server & Edge Runtime Environment Configuration for Frontend (`apps/web`).
 *
 * Safe to import in Next.js Edge Middleware (`src/proxy.ts`), Route Handlers,
 * Server Components, and isomorphic server branches (`typeof window === 'undefined'`).
 * Never exposes server secrets (`AUTH_COOKIE_SECRET`, `AUTH_JWT_SECRET`, `INTERNAL_API_URL`)
 * to browser bundles.
 */

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:3001';
const DEFAULT_ACCESS_COOKIE_NAME = 'access_token';
const DEFAULT_REFRESH_COOKIE_NAME = 'refresh_token';
const DEV_FALLBACK_COOKIE_SECRET = 'btn-hrms-dev-cookie-secret-do-not-use-in-production';

export function isProductionServerEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getAccessCookieName(): string {
  const raw = process.env.AUTH_ACCESS_COOKIE_NAME?.trim();
  return raw || DEFAULT_ACCESS_COOKIE_NAME;
}

export function getRefreshCookieName(): string {
  const raw = process.env.AUTH_REFRESH_COOKIE_NAME?.trim();
  return raw || DEFAULT_REFRESH_COOKIE_NAME;
}

/**
 * Resolves the internal backend origin used by Next.js SSR, Route Handlers, and rewrites.
 * Canonical variable: `INTERNAL_API_URL` (falls back to deprecated `API_URL` for migration compatibility).
 */
export function resolveInternalApiUrl(): string {
  const raw = (process.env.INTERNAL_API_URL || process.env.API_URL || '').trim();
  if (!raw) {
    return DEFAULT_INTERNAL_API_URL;
  }

  const normalized = raw.replace(/\/+$/, '');
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('INTERNAL_API_URL must use http: or https: protocol');
    }
    return normalized;
  } catch (err) {
    if (err instanceof Error && err.message.includes('protocol')) {
      throw err;
    }
    throw new Error(`INTERNAL_API_URL must be a valid URL (got "${raw}")`);
  }
}

/**
 * Resolves and validates the HMAC signing secret for Edge permission-session cookies.
 * Canonical variable: `AUTH_COOKIE_SECRET` (falls back to `AUTH_JWT_SECRET` or deprecated `JWT_SECRET`).
 */
export function getAuthCookieSecret(explicitSecret?: string): string {
  const secret = (
    explicitSecret ||
    process.env.AUTH_COOKIE_SECRET ||
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    ''
  ).trim();

  if (!secret) {
    if (isProductionServerEnv()) {
      throw new Error('AUTH_COOKIE_SECRET or AUTH_JWT_SECRET must be configured in production');
    }
    return DEV_FALLBACK_COOKIE_SECRET;
  }

  if (isProductionServerEnv() && !explicitSecret && secret.length < 32) {
    throw new Error('AUTH_COOKIE_SECRET (or AUTH_JWT_SECRET) must be at least 32 characters in production');
  }

  return secret;
}
