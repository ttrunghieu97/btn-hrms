import { type NextRequest, NextResponse } from 'next/server';
import {
  appendSetCookieHeaders,
  buildBackendUrl,
  createForwardHeaders,
  refreshAccessToken
} from '@/lib/server/backend-proxy';

function copyFileResponseHeaders(target: Headers, source: Headers): void {
  const contentType = source.get('content-type');
  const contentLength = source.get('content-length');
  const contentRange = source.get('content-range');
  const etag = source.get('etag');
  const lastModified = source.get('last-modified');
  const cacheControl = source.get('cache-control');

  if (contentType) target.set('content-type', contentType);
  if (contentLength) target.set('content-length', contentLength);
  if (contentRange) target.set('content-range', contentRange);
  if (etag) target.set('etag', etag);
  if (lastModified) target.set('last-modified', lastModified);
  if (cacheControl) target.set('cache-control', cacheControl);
}

function buildFileHeaders(request: NextRequest): Headers {
  const headers = createForwardHeaders(request);
  const rangeHeader = request.headers.get('range');
  const ifNoneMatch = request.headers.get('if-none-match');

  if (rangeHeader) headers.set('range', rangeHeader);
  if (ifNoneMatch) headers.set('if-none-match', ifNoneMatch);

  return headers;
}

// Proxy exception: file streams need cookie refresh + binary/range header passthrough; generated JSON fetchers cannot preserve that contract.
async function fetchFileResponse(backendUrl: string, headers: Headers): Promise<Response> {
  return fetch(backendUrl, {
    headers,
    cache: 'no-store'
  });
}

async function refreshFileAccess(cookieHeader: string, headers: Headers): Promise<{
  accessToken: string | null;
  refreshResponse: Response;
}> {
  const { accessToken, response } = await refreshAccessToken(cookieHeader);
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  return { accessToken, refreshResponse: response };
}

function createRetryHeaders(headers: Headers, accessToken: string): Headers {
  const retryHeaders = new Headers(headers);
  retryHeaders.set('authorization', `Bearer ${accessToken}`);
  return retryHeaders;
}

async function createFileErrorResponse(
  response: Response,
  refreshResponse?: Response
): Promise<NextResponse> {
  const body = await response.text().catch(() => '');
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const failed = new NextResponse(body || null, { status: response.status, headers });
  if (refreshResponse) {
    appendSetCookieHeaders(failed.headers, refreshResponse.headers);
  }
  return failed;
}

function createFileSuccessResponse(response: Response, refreshResponse?: Response): NextResponse {
  const responseHeaders = new Headers();
  copyFileResponseHeaders(responseHeaders, response.headers);
  if (refreshResponse) {
    appendSetCookieHeaders(responseHeaders, refreshResponse.headers);
  }
  return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
}

function canRefresh(cookieHeader: string | null, authorizationHeader: string | null): cookieHeader is string {
  return Boolean(cookieHeader && !authorizationHeader);
}

function shouldRetryAfterRefresh(response: Response, accessToken: string | null): boolean {
  return response.status === 401 && !accessToken;
}

function hasAccessToken(accessToken: string | null): accessToken is string {
  return accessToken !== null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendUrl = buildBackendUrl(`/files/${path.join('/')}`);
  const headers = buildFileHeaders(request);
  const cookieHeader = request.headers.get('cookie');
  const authorizationHeader = request.headers.get('authorization');

  let refreshResponse: Response | undefined;
  let accessTokenFromRefresh: string | null = null;

  if (canRefresh(cookieHeader, authorizationHeader)) {
    const refreshResult = await refreshFileAccess(cookieHeader, headers);
    refreshResponse = refreshResult.refreshResponse;
    accessTokenFromRefresh = refreshResult.accessToken;
  }

  let response = await fetchFileResponse(backendUrl, headers);

  if (shouldRetryAfterRefresh(response, accessTokenFromRefresh) && cookieHeader) {
    const refreshResult = await refreshFileAccess(cookieHeader, headers);
    refreshResponse = refreshResult.refreshResponse;

    if (hasAccessToken(refreshResult.accessToken)) {
      response = await fetchFileResponse(
        backendUrl,
        createRetryHeaders(headers, refreshResult.accessToken)
      );
    }
  }

  if (!response.ok) {
    return createFileErrorResponse(response, refreshResponse);
  }

  return createFileSuccessResponse(response, refreshResponse);
}
