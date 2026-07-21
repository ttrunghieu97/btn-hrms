import { type NextRequest, NextResponse } from 'next/server';
import { unwrapData } from '@/lib/api-extract';
import { envClient } from '../env.client';

const BACKEND_URL = envClient.apiBaseUrl.replace(/\/+$/, '');

export function buildBackendUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
}

export function createForwardHeaders(request: NextRequest, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const cookieHeader = request.headers.get('cookie');
  const authorizationHeader = request.headers.get('authorization');
  const acceptHeader = request.headers.get('accept');
  const contentTypeHeader = request.headers.get('content-type');

  if (cookieHeader && !headers.has('cookie')) headers.set('cookie', cookieHeader);
  if (authorizationHeader && !headers.has('authorization')) headers.set('authorization', authorizationHeader);
  if (acceptHeader && !headers.has('accept')) headers.set('accept', acceptHeader);
  if (contentTypeHeader && !headers.has('content-type')) headers.set('content-type', contentTypeHeader);

  return headers;
}

export function extractAccessTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const result = unwrapData<{ access_token: string } | null>(payload);
  return result?.access_token ?? null;
}

export async function refreshAccessToken(cookieHeader: string): Promise<{
  accessToken: string | null;
  response: Response;
}> {
  const response = await fetch(buildBackendUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
      'content-type': 'application/json'
    },
    body: '{}',
    cache: 'no-store'
  });

  const payload = response.ok ? await response.json().catch(() => null) : null;

  return {
    accessToken: extractAccessTokenFromPayload(payload),
    response
  };
}

export function appendSetCookieHeaders(target: Headers, source: Headers): void {
  const sourceWithOptionalGetSetCookie = source as Headers & { getSetCookie?: () => string[] };
  const setCookies = typeof sourceWithOptionalGetSetCookie.getSetCookie === 'function'
    ? sourceWithOptionalGetSetCookie.getSetCookie()
    : [];

  if (setCookies.length > 0) {
    for (const value of setCookies) {
      target.append('set-cookie', value);
    }
    return;
  }

  const rawSetCookie = source.get('set-cookie');
  if (rawSetCookie) {
    target.append('set-cookie', rawSetCookie);
  }
}

export async function proxyJsonResponse(response: Response): Promise<NextResponse> {
  const bodyText = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  const cacheControl = response.headers.get('cache-control');

  if (contentType) headers.set('content-type', contentType);
  if (cacheControl) headers.set('cache-control', cacheControl);
  appendSetCookieHeaders(headers, response.headers);

  return new NextResponse(bodyText, {
    status: response.status,
    headers
  });
}
