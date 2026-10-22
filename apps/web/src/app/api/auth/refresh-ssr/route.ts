import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInternalRedirectPath } from '@/lib/auth-landing';
import { appendSetCookieHeaders, buildBackendUrl } from '@/lib/server/backend-proxy';

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:8080';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeInternalRedirectPath(
    request.nextUrl.searchParams.get('redirectTo'),
    '/'
  );
  const loginUrl = sanitizeInternalRedirectPath(
    request.nextUrl.searchParams.get('loginUrl'),
    '/auth/sign-in'
  );

  const cookieHeader = request.headers.get('cookie') || '';
  if (!cookieHeader) {
    return NextResponse.redirect(new URL(loginUrl, requestOrigin(request)));
  }

  let response: Response;
  try {
    response = await fetch(buildBackendUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'content-type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.redirect(new URL(loginUrl, requestOrigin(request)));
  }

  if (!response.ok) {
    return NextResponse.redirect(new URL(loginUrl, requestOrigin(request)));
  }

  const nextResponse = NextResponse.redirect(new URL(redirectTo, requestOrigin(request)));
  appendSetCookieHeaders(nextResponse.headers, response.headers);

  return nextResponse;
}
