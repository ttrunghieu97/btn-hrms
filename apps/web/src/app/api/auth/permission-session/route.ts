import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-proxy';

/**
 * API route to manage permission session cookie.
 * POST  = refresh (set) cookie after login
 * DELETE = clear cookie on logout
 */
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';

  if (!cookieHeader) {
    return NextResponse.json({ ok: false, reason: 'no-cookie' }, { status: 401 });
  }

  // Fetch user from backend to get permissions
  let response: Response;
  try {
    response = await fetch(buildBackendUrl('/users/me'), {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ ok: false, reason: 'backend-unreachable' }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ ok: false, reason: 'not-authenticated' }, { status: 401 });
  }

  const body = await response.json();
  const user = body?.data?.data ?? body?.data ?? body;
  const permissions: string[] = user?.permissions ?? [];

  // Encrypt permissions into cookie
  const { encodePermissions } = await import('@/lib/server/permission-session-edge');
  const cookieValue = encodePermissions(permissions);

  const nextResponse = NextResponse.json({ ok: true });

  nextResponse.cookies.set('session_perms', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  return nextResponse;
}

/**
 * DELETE — clear permission cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('session_perms', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
