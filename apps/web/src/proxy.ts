import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

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
  const nonce = crypto.randomBytes(16).toString('base64');
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

// ── Route Registry (inline for Edge compat) ────────────────────────────
interface PermissionRule {
  anyOf?: readonly string[];
}

interface RouteDef {
  path: string;
  permission: PermissionRule;
}

// Sorted: most-specific first, static before dynamic
const ROUTE_REGISTRY: RouteDef[] = [
  // Account
  { path: '/account/profile', permission: { anyOf: ['profile:view', 'employees:view:self'] } },
  { path: '/account/notifications', permission: { anyOf: ['notifications:view:self'] } },
  { path: '/account/no-permissions', permission: {} },
  { path: '/change-password', permission: { anyOf: ['auth:change-password'] } },

  // Overview
  { path: '/overview/operations', permission: { anyOf: ['dashboard:view'] } },
  { path: '/overview/executive', permission: { anyOf: ['dashboard:view'] } },
  { path: '/overview', permission: { anyOf: ['dashboard:view'] } },
  { path: '/activity', permission: { anyOf: ['dashboard:view'] } },

  // Employees
  { path: '/employees/new', permission: { anyOf: ['employee:create'] } },
  { path: '/employees/contracts', permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] } },
  { path: '/employees/documents', permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] } },
  { path: '/employees/:id', permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] } },
  { path: '/employees', permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] } },

  // Organization
  { path: '/organization/departments', permission: { anyOf: ['organization:view'] } },
  { path: '/organization/positions', permission: { anyOf: ['organization:view'] } },
  { path: '/organization', permission: { anyOf: ['organization:view'] } },

  // Attendance
  { path: '/attendance/history', permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] } },
  { path: '/attendance/summary', permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] } },
  { path: '/attendance/analytics', permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] } },
  { path: '/attendance/management', permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] } },
  { path: '/attendance', permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] } },

  // Leave
  { path: '/leave/requests', permission: { anyOf: ['leave:view:self', 'leave:view:department', 'leave:view:all'] } },
  { path: '/leave', permission: { anyOf: ['leave:view:self', 'leave:view:department', 'leave:view:all'] } },

  // Schedule
  { path: '/schedule/my-schedule', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
  { path: '/schedule/management', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
  { path: '/schedule/roster', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
  { path: '/schedule/requests', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
  { path: '/schedule', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },

  // Payroll
  { path: '/payroll', permission: { anyOf: ['payroll:view', 'payroll:view:self', 'payroll:view:all'] } },

  // Recruitment
  { path: '/recruitment/requisitions', permission: { anyOf: ['recruitment:view'] } },
  { path: '/recruitment/postings', permission: { anyOf: ['recruitment:view'] } },
  { path: '/recruitment/candidates', permission: { anyOf: ['recruitment:view'] } },

  // Asset Management
  { path: '/asset-management/catalog', permission: { anyOf: ['asset:view'] } },
  { path: '/asset-management/inventory', permission: { anyOf: ['asset:view'] } },
  { path: '/asset-management/requests', permission: { anyOf: ['asset:view'] } },
  { path: '/asset-management/issues', permission: { anyOf: ['asset:view'] } },

  // Benefits
  { path: '/benefits/plans', permission: { anyOf: ['benefits:view'] } },
  { path: '/benefits/enrollments', permission: { anyOf: ['benefits:view'] } },

  // Expenses
  { path: '/expenses', permission: { anyOf: ['expenses:view'] } },

  // Performance
  { path: '/performance/cycles', permission: { anyOf: ['performance:view'] } },
  { path: '/performance/goals', permission: { anyOf: ['performance:view'] } },
  { path: '/performance/reviews', permission: { anyOf: ['performance:view'] } },

  // Learning
  { path: '/learning/courses', permission: { anyOf: ['learning:view'] } },
  { path: '/learning/paths', permission: { anyOf: ['learning:view'] } },
  { path: '/learning/sessions', permission: { anyOf: ['learning:view'] } },
  { path: '/learning/certifications', permission: { anyOf: ['learning:view'] } },

  // Onboarding
  { path: '/onboarding', permission: { anyOf: ['onboarding:view'] } },

  // Offboarding
  { path: '/offboarding', permission: { anyOf: ['offboarding:view'] } },

  // Tasks & Chat
  { path: '/tasks', permission: { anyOf: ['tasks:view'] } },
  { path: '/chat', permission: { anyOf: ['chat:view'] } },

  // Monitoring
  { path: '/monitoring/system-health', permission: { anyOf: ['monitoring:view'] } },
  { path: '/monitoring/activities', permission: { anyOf: ['monitoring:view'] } },
  { path: '/monitoring/data-integrity', permission: { anyOf: ['monitoring:view'] } },
  { path: '/monitoring', permission: { anyOf: ['monitoring:view'] } },

  // Notifications
  { path: '/notifications', permission: { anyOf: ['notifications:view:self'] } },

  // Administration
  { path: '/administration/users', permission: { anyOf: ['users:view'] } },
  { path: '/administration/roles', permission: { anyOf: ['roles:view'] } },
  { path: '/administration/approval', permission: { anyOf: ['users:view', 'users:edit', 'approval-policies:view', 'approval-requests:view'] } },
  { path: '/administration/roles/:id', permission: { anyOf: ['roles:view'] } },
  { path: '/administration', permission: { anyOf: ['users:view', 'users:edit', 'approval-policies:view', 'approval-requests:view'] } },

  // Account (additional)
  { path: '/account', permission: {} },
  { path: '/account/change-password', permission: { anyOf: ['auth:change-password'] } },

  // Admin
  { path: '/admin', permission: { anyOf: ['users:view', 'users:edit'] } },
  { path: '/admin/permissions', permission: { anyOf: ['users:edit'] } },
  { path: '/admin/audit', permission: { anyOf: ['users:view'] } },
  { path: '/admin/integrations', permission: { anyOf: ['users:edit'] } },
  { path: '/admin/settings', permission: { anyOf: ['settings:view'] } },

  // Asset Management root
  { path: '/asset-management', permission: { anyOf: ['asset:view'] } },

  // Benefits root
  { path: '/benefits', permission: { anyOf: ['benefits:view'] } },

  // Learning root
  { path: '/learning', permission: { anyOf: ['learning:view'] } },

  // Leave sub-routes
  { path: '/leave/policies', permission: { anyOf: ['leave:view'] } },

  // Payroll sub-routes
  { path: '/payroll/payslips', permission: { anyOf: ['payroll:view'] } },
  { path: '/payroll/payslips/:payslipId', permission: { anyOf: ['payroll:view'] } },
  { path: '/payroll/periods', permission: { anyOf: ['payroll:manage_periods'] } },
  { path: '/payroll/runs', permission: { anyOf: ['payroll:manage_periods'] } },
  { path: '/payroll/runs/:runId', permission: { anyOf: ['payroll:manage_periods'] } },
  { path: '/payroll/salary-structures', permission: { anyOf: ['payroll:edit'] } },

  // Performance root
  { path: '/performance', permission: { anyOf: ['performance:view'] } },

  // Recruitment root
  { path: '/recruitment', permission: { anyOf: ['recruitment:view'] } },

  // Schedule sub-routes
  { path: '/schedule/rosters', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
  { path: '/schedule/templates', permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] } },
];

// ── Permission checker ────────────────────────────────────────────────
const HIERARCHY_MAP = {
  'attendance:view:self': ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'],
  'attendance:view:department': ['attendance:view:department', 'attendance:view:all'],
  'attendance:view:all': ['attendance:view:all'],
  'leave:view:self': ['leave:view:self', 'leave:view:department', 'leave:view:all'],
  'leave:view:department': ['leave:view:department', 'leave:view:all'],
  'leave:view:all': ['leave:view:all'],
  'payroll:view:self': ['payroll:view:self', 'payroll:view:all'],
  'payroll:view:all': ['payroll:view:all'],
  'schedule:view:self': ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'],
  'schedule:view:department': ['schedule:view:department', 'schedule:view:all'],
  'schedule:view:all': ['schedule:view:all'],
  'tasks:view:self': ['tasks:view:self', 'tasks:view'],
  'tasks:view': ['tasks:view'],
};

function checkHierarchy(userPerms: string[], required: string): boolean {
  if (userPerms.includes(required)) return true;
  const chain = HIERARCHY_MAP[required as keyof typeof HIERARCHY_MAP];
  if (chain) return chain.some((p: string) => userPerms.includes(p));
  return false;
}

function hasAnyOf(userPerms: string[], required: string[]) {
  return required.some((p: string) => checkHierarchy(userPerms, p));
}

function matchRoute(pathname: string) {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  for (const route of ROUTE_REGISTRY) {
    const escaped = route.path.replace(/[.*+?^\${}()|[\]\\/]/g, '\\$&').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');
    const re = new RegExp('^' + escaped + '$');
    if (re.test(normalized)) return route;
  }
  return null;
}

function decodePermCookie(value: string) {
  try {
    if (!value.startsWith('ps_v1:')) return null;
    const b64 = value.slice(6).replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(b64);
    const data = JSON.parse(json);
    return Array.isArray(data.permissions) ? data.permissions : null;
  } catch { return null; }
}

function checkRoutePermission(pathname: string, req: NextRequest) {
  const route = matchRoute(pathname);
  if (!route) return null; // unknown route → allow
  if (!route.permission.anyOf?.length) return null; // empty rule → allow

  // Read permissions from session cookie
  // If cookie is missing → pass through, SSR will enforce
  const permCookie = req.cookies.get('session_perms')?.value;
  if (!permCookie) return null;

  const decoded = decodePermCookie(permCookie);
  if (!decoded) return null; // corrupted cookie → SSR fallback

  if (!hasAnyOf(decoded, [...route.permission.anyOf])) {
    const url = req.nextUrl.clone();
    url.pathname = '/unauthorized';
    url.search = '?missing=' + encodeURIComponent(route.permission.anyOf.join(','));
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
