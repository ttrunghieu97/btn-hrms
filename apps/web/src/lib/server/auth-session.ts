import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { usersControllerGetMe } from '@/api/generated/users-management/users-management';
import type { UserMeResponseDto } from '@/api/generated/model';
import { unwrapData } from '@/lib/api-extract';
import { sanitizeInternalRedirectPath } from '@/lib/auth-landing';
import { appLogger } from '@/lib/logger';
import { getErrorObservabilityContext, resolveAppError } from '@/lib/error-taxonomy';
import { getAccessCookieName, getRefreshCookieName } from '@/lib/env.server';

type ServerSessionResult =
  | { status: 'authenticated'; user: UserMeResponseDto }
  | { status: 'unauthenticated' };

const ACCESS_COOKIE_NAME = getAccessCookieName();
const REFRESH_COOKIE_NAME = getRefreshCookieName();

const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_MAX_ENTRIES = 1_000;

const memorySessionCache = new Map<string, { user: UserMeResponseDto; expires: number }>();

function getCachedSession(token: string): UserMeResponseDto | null {
  const cachedMem = memorySessionCache.get(token);
  if (cachedMem && cachedMem.expires > Date.now()) {
    return cachedMem.user;
  }
  if (cachedMem) {
    memorySessionCache.delete(token);
  }
  return null;
}

function setCachedSession(token: string, user: UserMeResponseDto): void {
  const now = Date.now();
  if (memorySessionCache.size >= SESSION_CACHE_MAX_ENTRIES) {
    for (const [k, v] of memorySessionCache.entries()) {
      if (v.expires <= now) {
        memorySessionCache.delete(k);
      }
    }
    if (memorySessionCache.size >= SESSION_CACHE_MAX_ENTRIES) {
      const oldestKey = memorySessionCache.keys().next().value;
      if (oldestKey !== undefined) {
        memorySessionCache.delete(oldestKey);
      }
    }
  }
  memorySessionCache.set(token, { user, expires: now + SESSION_CACHE_TTL_MS });
}

export async function evictServerSessionCache(token?: string | null): Promise<void> {
  if (!token) return;
  memorySessionCache.delete(token);
}

// --- Retry ---
async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  retries: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries && shouldRetry(error)) {
        await new Promise<void>((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function buildServiceUnavailableUrl(requestId?: string): string {
  const params = new URLSearchParams({ source: 'auth-session' });
  if (requestId) {
    params.set('requestId', requestId);
  }

  return `/service-unavailable?${params.toString()}`;
}

function isAuthenticatedSession(
  session: ServerSessionResult,
): session is { status: 'authenticated'; user: UserMeResponseDto } {
  return session.status === 'authenticated';
}

export async function hasServerAuthCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value || cookieStore.get(REFRESH_COOKIE_NAME)?.value
  );
}

async function fetchServerUser(cookieHeader: string, accessToken?: string): Promise<UserMeResponseDto> {
  const headersObj: Record<string, string> = { cookie: cookieHeader };
  if (accessToken) {
    headersObj.authorization = `Bearer ${accessToken}`;
  }
  const response = await usersControllerGetMe({
    headers: headersObj,
  });
  return unwrapData<UserMeResponseDto>(response);
}

const resolveServerSession = cache(async (): Promise<ServerSessionResult> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return { status: 'unauthenticated' };
  }

  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const cached = getCachedSession(accessToken);
    if (cached) {
      return { status: 'authenticated', user: cached };
    }
  }

  try {
    const user = await withRetry(
      () => fetchServerUser(cookieHeader, accessToken),
      (err) => resolveAppError(err).kind === 'service-unavailable',
      2,
      200,
    );
    if (accessToken) {
      setCachedSession(accessToken, user);
    }
    return { status: 'authenticated', user };
  } catch (error) {
    if (resolveAppError(error).kind === 'unauthenticated') {
      return { status: 'unauthenticated' };
    }
    throw error;
  }
});

/**
 * Redirect to a Route Handler that refreshes the access token server-side.
 * The Route Handler sets Set-Cookie headers on the response and redirects
 * back to the target page (or to sign-in on failure).
 *
 * This cannot be done inline because cookieStore.set() is not available
 * in server component context — only in Server Actions or Route Handlers.
 */
async function tryServerRefresh(loginUrl: string): Promise<never> {
  let redirectTo = '/';
  try {
    const h = await headers();
    const rawPath = h.get('x-forwarded-path') ?? h.get('next-url');
    redirectTo = sanitizeInternalRedirectPath(rawPath, '/');
  } catch {
    redirectTo = '/';
  }
  const safeLoginUrl = sanitizeInternalRedirectPath(loginUrl, '/auth/sign-in');
  const params = new URLSearchParams({ loginUrl: safeLoginUrl, redirectTo });
  redirect(`/api/auth/refresh-ssr?${params.toString()}`);
}

export async function requireServerSession(redirectTo = '/auth/sign-in'): Promise<UserMeResponseDto> {
  try {
    const session = await resolveServerSession();
    if (!isAuthenticatedSession(session)) {
      return tryServerRefresh(redirectTo);
    }
    return (session as { status: "authenticated"; user: UserMeResponseDto }).user;
  } catch (error) {
    unstable_rethrow(error);
    const resolved = resolveAppError(error);
    if (resolved.kind === 'service-unavailable') {
      const err = error as Error;
      const message = err.message || resolved.message;
      const stack = err.stack;
      appLogger.error('auth_session_unavailable', {
        source: 'auth-session',
        ...getErrorObservabilityContext(error),
        message,
        stack,
      });
      redirect(buildServiceUnavailableUrl(resolved.referenceId));
    }
    throw error;
  }
}
