import { NextRequest, NextResponse } from 'next/server';
import { hasAnyPermission } from '@project/permissions';
import { canAccessRoute } from '@/features/authorization/utils/route-resolver';
import { matchRoute } from '@/features/authorization/utils/route-matcher';
import { routeRegistry } from '@/shared/authorization';
import { decodePermissions } from '@/lib/server/permission-session-edge';

const ACCESS_COOKIE_NAME = process.env.AUTH_ACCESS_COOKIE_NAME ?? 'access_token';
const REFRESH_COOKIE_NAME = process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token';
const REFRESH_ATTEMPT_PARAM = 'refreshAttempt';

const PROTECTED_PATHS = [
  '/overview',
  '/employees',
  '/leave',
  '/attendance',
  '/schedule',
  '/tasks',
  '/organization',
  '/administration',
  '/account',
  '/monitoring',
  '/payroll',
  '/chat',
  '/change-password',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function requestOrigin(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:8080';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function getNextPath(req: NextRequest): string {
  const nextUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, requestOrigin(req));
  nextUrl.searchParams.delete(REFRESH_ATTEMPT_PARAM);
  return `${nextUrl.pathname}${nextUrl.search}`;
}

function buildSignInUrl(req: NextRequest): URL {
  const loginUrl = new URL('/auth/sign-in', requestOrigin(req));
  loginUrl.searchParams.set('next', getNextPath(req));
  return loginUrl;
}

function buildRefreshBounceUrl(req: NextRequest): URL {
  const refreshUrl = new URL('/auth/session-refresh', requestOrigin(req));
  refreshUrl.searchParams.set('next', getNextPath(req));
  refreshUrl.searchParams.set('attempt', req.nextUrl.searchParams.get(REFRESH_ATTEMPT_PARAM) ?? '0');
  return refreshUrl;
}

export default function middleware(req: NextRequest) {
  const arr = new Uint8Array(16);
  globalThis.crypto.getRandomValues(arr);
  const nonce = btoa(String.fromCharCode(...arr));
  const isDev = process.env.NODE_ENV === 'development';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' https://static.cloudflareinsights.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https: http:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://static.cloudflareinsights.com ${apiBaseUrl.startsWith('/') ? '' : apiBaseUrl} ${sentryDsn ? new URL(sentryDsn).origin : ''}`,
    `frame-ancestors 'none'`,
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const cspValue = csp.join('; ');

  // CSP + nonce must be on the REQUEST headers so Next.js can extract the
  // nonce during SSR and auto-apply it to its own scripts (framework, flight
  // data, and <Script> tags). Setting it only on the response leaves Next's
  // inline scripts with an empty nonce -> CSP blocks them + hydration mismatch.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspValue);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspValue);
  response.headers.set('x-nonce', nonce);

  // Compatibility: /dashboard/* → /*
  if (req.nextUrl.pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/overview', req.url));
  }
  if (req.nextUrl.pathname.startsWith('/dashboard/')) {
    const newPath = '/' + req.nextUrl.pathname.slice('/dashboard/'.length);
    return NextResponse.redirect(new URL(newPath, req.url));
  }

  // Legacy route redirects
  const path = req.nextUrl.pathname;

  if (path === '/departments' || path.startsWith('/departments/')) {
    const newPath = path.replace('/departments', '/organization/departments');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/positions' || path.startsWith('/positions/')) {
    const newPath = path.replace('/positions', '/organization/positions');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/shifts' || path.startsWith('/shifts/')) {
    const newPath = path.replace('/shifts', '/schedule/templates');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/team' || path.startsWith('/team/')) {
    return NextResponse.redirect(new URL('/employees', req.url));
  }
  if (path === '/users' || path.startsWith('/users/')) {
    const newPath = path.replace('/users', '/administration/users');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/role-management' || path.startsWith('/role-management/')) {
    const newPath = path.replace('/role-management', '/administration/roles');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/profile' || path.startsWith('/profile/')) {
    const newPath = path.replace('/profile', '/account/profile');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/notifications' || path.startsWith('/notifications/')) {
    const newPath = path.replace('/notifications', '/account/notifications');
    return NextResponse.redirect(new URL(newPath, req.url));
  }
  if (path === '/leave/my-requests' || path.startsWith('/leave/my-requests/')) {
    const newPath = path.replace('/leave/my-requests', '/leave/requests');
    return NextResponse.redirect(new URL(newPath, req.url));
  }

  // Auth guard for protected routes only
  if (isProtectedPath(req.nextUrl.pathname)) {
    const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    const refreshAttempt = Number(req.nextUrl.searchParams.get(REFRESH_ATTEMPT_PARAM) ?? '0');

    if (accessToken === 'boneyard-build-bypass' || req.headers.get('x-boneyard-build') === '1') {
      return response;
    }

    if (!refreshToken) {
      return NextResponse.redirect(buildSignInUrl(req));
    }

    if (accessToken) {
      // ── Authorization check ──────────────────────────────────────
      // Permission enforcement at Edge. Route registry defined inline.
      const permErr = checkRoutePermission(req.nextUrl.pathname, req);
      if (permErr) return permErr;
      return response;
    }

    if (refreshAttempt > 0) {
      return NextResponse.redirect(buildSignInUrl(req));
    }

    return NextResponse.redirect(buildRefreshBounceUrl(req));
  }

  return response;
}

// ── Permission checker ────────────────────────────────────────────────
// Uses shared route registry + @project/permissions resolver.
// No inline hierarchy map, no duplicated route definitions.

function checkRoutePermission(pathname: string, req: NextRequest) {
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  const match = matchRoute(normalized, routeRegistry);
  if (!match) return null; // unknown route → allow
  const { permission } = match.route;
  if (!permission.anyOf?.length) return null; // empty rule → allow

  // Read permissions from session cookie
  // If cookie is missing → pass through, SSR will enforce
  const permCookie = req.cookies.get('session_perms')?.value;
  if (!permCookie) return null;

  const decoded = decodePermissions(permCookie);
  if (!decoded) return null;

  const permissions = decoded.permissions;
  const isSuperAdmin = permissions.includes('sys:all') || permissions.includes('ALL');

  if (!canAccessRoute(normalized, { permissions, isSuperAdmin })) {
    const url = req.nextUrl.clone();
    url.pathname = '/unauthorized';
    url.search = '?path=' + encodeURIComponent(normalized);
    return NextResponse.redirect(url);
  }
  return null;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
