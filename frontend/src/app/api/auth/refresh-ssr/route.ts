import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-proxy';

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:8080';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/overview';
  const loginUrl = request.nextUrl.searchParams.get('loginUrl') || '/auth/sign-in';

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

  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    nextResponse.headers.append('set-cookie', cookie);
  }

  return nextResponse;
}
