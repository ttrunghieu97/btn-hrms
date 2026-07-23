import { type NextRequest, NextResponse } from 'next/server';
import { appLogger } from '@/lib/logger';
import { buildBackendUrl, createForwardHeaders, proxyJsonResponse } from '@/lib/server/backend-proxy';

const MAX_ATTEMPTS = 1;

function getNextPath(request: NextRequest): string {
  const next = request.nextUrl.searchParams.get('next');
  if (!next || !next.startsWith('/')) {
    return '/overview';
  }
  return next;
}

function getAttempt(request: NextRequest): number {
  const raw = Number(request.nextUrl.searchParams.get('attempt') ?? '0');
  return Number.isFinite(raw) ? raw : 0;
}

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:8080';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function buildSignInUrl(request: NextRequest, nextPath: string): URL {
  const loginUrl = new URL('/auth/sign-in', requestOrigin(request));
  loginUrl.searchParams.set('next', nextPath);
  return loginUrl;
}

function buildRetryUrl(request: NextRequest, nextPath: string, attempt: number): URL {
  const retryUrl = new URL(nextPath, requestOrigin(request));
  retryUrl.searchParams.set('refreshAttempt', String(attempt));
  return retryUrl;
}

export async function GET(request: NextRequest) {
  const nextPath = getNextPath(request);
  const attempt = getAttempt(request);

  appLogger.info('auth_session_refresh_route_hit', {
    source: 'session-refresh-route',
    nextPath,
    attempt
  });

  if (attempt >= MAX_ATTEMPTS) {
    appLogger.warn('auth_session_refresh_route_redirect_sign_in', {
      source: 'session-refresh-route',
      nextPath,
      attempt,
      reason: 'max_attempts_reached'
    });
    return NextResponse.redirect(buildSignInUrl(request, nextPath));
  }

  const refreshRequest = new Request(buildBackendUrl('/auth/refresh'), {
    method: 'POST',
    headers: createForwardHeaders(request, {
      'content-type': 'application/json'
    }),
    body: '{}'
  });

  const refreshResponse = await fetch(refreshRequest, { cache: 'no-store' });

  if (!refreshResponse.ok) {
    appLogger.warn('auth_session_refresh_route_failed', {
      source: 'session-refresh-route',
      nextPath,
      attempt,
      status: refreshResponse.status
    });
    return NextResponse.redirect(buildSignInUrl(request, nextPath));
  }

  appLogger.info('auth_session_refresh_route_succeeded', {
    source: 'session-refresh-route',
    nextPath,
    attempt,
    status: refreshResponse.status
  });

  const redirectResponse = NextResponse.redirect(buildRetryUrl(request, nextPath, attempt + 1));
  const proxiedRefreshResponse = await proxyJsonResponse(refreshResponse);

  proxiedRefreshResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      redirectResponse.headers.append(key, value);
    }
  });

  return redirectResponse;
}
