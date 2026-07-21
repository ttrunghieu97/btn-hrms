/**
 * Custom fetch mutator for orval-generated client.
 * - Attach Bearer token + x-request-id
 * - Handle 401 with refresh mutex + queue (single mutex, delegated to injected refreshFn)
 * - Map errors to typed ApiError
 * - Emit performance events
 *
 * orval config: override.mutator.path = './src/lib/fetcher.ts', name = 'customFetch'
 *
 * Call `setRefreshHandler(fn)` once at app bootstrap (e.g. in auth-store init) to wire
 * the store's refresh mutex into the fetcher. Prevents dual-mutex race that triggers BE
 * token-reuse detection and revokes the entire session.
 */

import { ApiError, ApiErrorCode, resolveApiErrorCode, type ApiErrorDetails } from './api-error';
import { envClient } from './env.client';
import { commonUiCopy } from './app-copy';
import { isUnauthenticatedError } from './error-taxonomy';
import { appLogger } from './logger';
import { setSentryRequestId } from './observability/init';
import { emitPerformanceEvent } from './performance';
import { getRequestId } from './request-id';
import { tokenStore } from './token-store';

const BASE_URL = envClient.apiBaseUrl.replace(/\/+$/, '');
const API_ORIGIN = (() => {
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return '';
  }
})();

const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/signin', '/auth/signup', '/auth/refresh'];
const REQUEST_TIMEOUT_MS = 15_000;

type RefreshResolver = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

// Injected by auth-store at bootstrap — single source of truth for refresh mutex
let _refreshHandler: (() => Promise<string | null>) | null = null;

export function setRefreshHandler(fn: () => Promise<string | null>) {
  _refreshHandler = fn;
}

let isRefreshing = false;
let refreshSubscribers: RefreshResolver[] = [];

function subscribeRefresh(sub: RefreshResolver) {
  refreshSubscribers.push(sub);
}

function notifyRefreshed(token: string) {
  refreshSubscribers.forEach((s) => s.resolve(token));
  refreshSubscribers = [];
}

function notifyRefreshFailed(err: unknown) {
  refreshSubscribers.forEach((s) => s.reject(err));
  refreshSubscribers = [];
}

/**
 * Build full URL. Orval passes url already prefixed with /api/v1/...
 * BASE_URL ends without slash, paths begin with slash.
 */
function buildUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith('/api/')) {
    if (typeof window !== 'undefined') return input; // let next rewrite handle in browser
    const internalUrl = process.env.API_URL || 'http://btn-hrms-api:3001';
    return `${internalUrl}${input}`;
  }
  return `${BASE_URL}${input.startsWith('/') ? input : `/${input}`}`;
}

function shouldSkipRefresh(url: string): boolean {
  return SKIP_REFRESH_PATHS.some((p) => url.includes(p));
}

// orval passes the full {data,status,headers} shape as T
// We build that shape internally and cast — no extra wrapper needed
type OrvalResponse<T> = T;

async function parseError(res: Response, requestId: string): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    /* ignore */
  }
  const root = (body ?? {}) as {
    error?: { message?: string; details?: ApiErrorDetails; code?: string };
    message?: string;
  };
  const message =
    root?.error?.message ?? root?.message ?? `HTTP ${res.status} ${res.statusText}`;
  return new ApiError({
    message,
    code: resolveApiErrorCode({ status: res.status, backendCode: root?.error?.code }),
    backendCode: root?.error?.code,
    status: res.status,
    details: root?.error?.details,
    requestId
  });
}

async function execute<T>(
  url: string,
  init: RequestInit,
  attempt = 0
): Promise<T> {
  const requestId = (init.headers as Record<string, string> | undefined)?.['x-request-id']
    ?? getRequestId();
  void setSentryRequestId(requestId);

  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('x-request-id', requestId);

  const startedAt = performance.now();
  const timeoutController = new AbortController();
  const timeoutError = new DOMException(
    `Request timed out after ${REQUEST_TIMEOUT_MS}ms`,
    'TimeoutError'
  );
  const timeoutId = globalThis.setTimeout(() => {
    timeoutController.abort(timeoutError);
  }, REQUEST_TIMEOUT_MS);

  if (init.signal) {
    if (init.signal.aborted) {
      timeoutController.abort(init.signal.reason);
    } else {
      init.signal.addEventListener(
        'abort',
        () => timeoutController.abort(init.signal?.reason),
        { once: true }
      );
    }
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(url), {
      ...init,
      credentials: 'include',
      headers,
      signal: timeoutController.signal
    });
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'TimeoutError'
        ? timeoutError.message
        : err instanceof Error
          ? err.message
          : 'Network error';
    throw new ApiError({
      message,
      code: resolveApiErrorCode({}),
      requestId,
      cause: err
    });
  } finally {
    clearTimeout(timeoutId);
    const duration = performance.now() - startedAt;
    queueMicrotask(() => {
      emitPerformanceEvent({
        type: 'fetch_latency',
        source: 'customFetch',
        durationMs: duration,
        metadata: { url, requestId }
      });
    });
  }

  // Refresh on 401 (skip auth endpoints + retried request)
  if (res.status === 401 && attempt === 0 && !shouldSkipRefresh(url)) {
    appLogger.info('auth_fetch_401_refresh_attempt', {
      source: 'fetcher',
      url,
      requestId
    });

    if (isRefreshing) {
      appLogger.debug('auth_fetch_401_join_refresh_queue', {
        source: 'fetcher',
        url,
        requestId
      });
      // Queue behind the in-flight refresh
      return new Promise<OrvalResponse<T>>((resolve, reject) => {
        subscribeRefresh({
          resolve: async (newToken) => {
            const retryHeaders = new Headers(init.headers);
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            try {
              resolve(await execute<T>(url, { ...init, headers: retryHeaders }, 1));
            } catch (e) {
              reject(e);
            }
          },
          reject
        });
      }) as Promise<T>;
    }

    isRefreshing = true;
    try {
      // Delegate to auth-store refresh (single mutex). Fall back to no-op if not yet wired.
      const newToken = _refreshHandler ? await _refreshHandler() : null;
      if (!newToken) {
        const authErr = new ApiError({
          message: commonUiCopy.sessionExpiredRedirecting,
          code: resolveApiErrorCode({ status: 401 }),
          status: 401,
          requestId
        });
        appLogger.warn('auth_fetch_refresh_failed', {
          source: 'fetcher',
          url,
          requestId,
          reason: 'refresh_handler_returned_null'
        });
        notifyRefreshFailed(authErr);
        throw authErr;
      }
      appLogger.info('auth_fetch_refresh_succeeded', {
        source: 'fetcher',
        url,
        requestId
      });
      notifyRefreshed(newToken);
      return execute<T>(url, init, 1);
    } catch (err) {
      if (!isUnauthenticatedError(err)) {
        appLogger.error('auth_fetch_refresh_failed', {
          source: 'fetcher',
          url,
          requestId,
          reason: err instanceof Error ? err.message : 'unknown_error'
        });
      }
      notifyRefreshFailed(err);
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    throw await parseError(res, requestId);
  }

  const body =
    [204, 205, 304].includes(res.status) ? null : await res.text();
  const data = (body ? JSON.parse(body) : null) as T;

  return { data, status: res.status, headers: res.headers } as T;
}

/**
 * Orval-compatible fetch mutator.
 * Signature matches orval generated `fetch(url, options)` calls.
 */
export const customFetch = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  return execute<T>(url, options ?? {});
};
