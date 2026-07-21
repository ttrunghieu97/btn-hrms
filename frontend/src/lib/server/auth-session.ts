import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { usersControllerGetMe } from '@/api/generated/endpoints';
import type { UserMeResponseDto } from '@/api/generated/model';
import { unwrapData } from '@/lib/api-extract';
import { appLogger } from '@/lib/logger';
import { getErrorObservabilityContext, resolveAppError } from '@/lib/error-taxonomy';
import { cacheGet, cacheSet } from './redis';

type ServerSessionResult =
  | { status: 'authenticated'; user: UserMeResponseDto }
  | { status: 'unauthenticated' };

const ACCESS_COOKIE_NAME = process.env.AUTH_ACCESS_COOKIE_NAME ?? 'access_token';
const REFRESH_COOKIE_NAME = process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token';

const SESSION_CACHE_TTL_MS = 30_000;

function sessionCacheKey(token: string): string {
  return `session:${token}`;
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

async function fetchServerUser(cookieHeader: string): Promise<UserMeResponseDto> {
  const response = await usersControllerGetMe({
    headers: {
      cookie: cookieHeader
    }
  });
  return unwrapData<UserMeResponseDto>(response);
}

async function resolveServerSession(): Promise<ServerSessionResult> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return { status: 'unauthenticated' };
  }

  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const cached = await cacheGet<UserMeResponseDto>(sessionCacheKey(accessToken));
    if (cached) {
      return { status: 'authenticated', user: cached };
    }
  }

  try {
    const user = await withRetry(
      () => fetchServerUser(cookieHeader),
      (err) => resolveAppError(err).kind === 'service-unavailable',
      2,
      200,
    );
    if (accessToken) {
      await cacheSet(sessionCacheKey(accessToken), user, SESSION_CACHE_TTL_MS);
    }
    return { status: 'authenticated', user };
  } catch (error) {
    if (resolveAppError(error).kind === 'unauthenticated') {
      return { status: 'unauthenticated' };
    }
    throw error;
  }
}

/**
 * Redirect to a Route Handler that refreshes the access token server-side.
 * The Route Handler sets Set-Cookie headers on the response and redirects
 * back to the target page (or to sign-in on failure).
 *
 * This cannot be done inline because cookieStore.set() is not available
 * in server component context — only in Server Actions or Route Handlers.
 */
async function tryServerRefresh(loginUrl: string): Promise<never> {
  const params = new URLSearchParams({ loginUrl });
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
