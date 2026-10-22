import { customFetch, normalizeHeaders, setRefreshHandler } from './fetcher';
import { appLogger } from './logger';
import { tokenStore } from './token-store';
import { resetAuthStoreRuntimeForTesting, useAuthStore, type User } from '@/stores/auth-store';

function makeJsonResponse(
  status: number,
  payload: unknown,
  extraHeaders?: Record<string, string>
): Response {
  const textBody = JSON.stringify(payload);
  const res = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...(extraHeaders ?? {}) }),
    text: async () => textBody,
    json: async () => payload,
    clone: () => res
  };
  return res as unknown as Response;
}

describe('fetcher & normalizeHeaders', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    tokenStore.clear();
    setRefreshHandler(async () => null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes headers from Headers instance, tuple array, and plain object', () => {
    const fromHeaders = normalizeHeaders(new Headers({ 'x-request-id': 'req-1', 'X-Custom': 'val' }));
    expect(fromHeaders.get('x-request-id')).toBe('req-1');
    expect(fromHeaders.get('x-custom')).toBe('val');

    const fromTuples = normalizeHeaders([
      ['x-request-id', 'req-2'],
      ['accept', 'application/json']
    ]);
    expect(fromTuples.get('x-request-id')).toBe('req-2');
    expect(fromTuples.get('accept')).toBe('application/json');

    const fromRecord = normalizeHeaders({
      'x-request-id': 'req-3',
      'x-multi': ['a', 'b'],
      'x-empty': undefined
    });
    expect(fromRecord.get('x-request-id')).toBe('req-3');
    expect(fromRecord.get('x-multi')).toBe('a, b');
    expect(fromRecord.has('x-empty')).toBe(false);
  });

  it('auto-attaches Content-Type: application/json for string bodies and preserves caller headers', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeJsonResponse(200, { data: { ok: true } }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    tokenStore.set('initial-token');
    await customFetch('/api/v1/approval-policies', {
      method: 'POST',
      headers: new Headers({ 'x-request-id': 'fixed-req-id', 'x-custom': 'keep-me' }),
      body: JSON.stringify({ key: 'leave' })
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.get('Content-Type')).toBe('application/json');
    expect(sentHeaders.get('Authorization')).toBe('Bearer initial-token');
    expect(sentHeaders.get('x-request-id')).toBe('fixed-req-id');
    expect(sentHeaders.get('x-custom')).toBe('keep-me');
  });

  it('overwrites stale Authorization header on 401 refresh retry', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeJsonResponse(200, { data: { id: 'u1' } }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    tokenStore.set('expired-token');
    setRefreshHandler(async () => {
      tokenStore.set('refreshed-token');
      return 'refreshed-token';
    });

    await customFetch('/api/v1/users/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer expired-token' }
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const retryHeaders = mockFetch.mock.calls[1][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer refreshed-token');
  });

  it('normalizes headers on queued concurrent 401 requests waiting for in-flight refresh', async () => {
    let resolveRefresh!: (token: string | null) => void;
    setRefreshHandler(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeJsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeJsonResponse(200, { data: { id: 'u1' } }))
      .mockResolvedValueOnce(makeJsonResponse(200, { data: { id: 'u2' } }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    tokenStore.set('expired-token');

    const req1 = customFetch('/api/v1/users/me', {
      method: 'GET',
      headers: { 'x-trace': 'trace-1' }
    });
    const req2 = customFetch('/api/v1/employees', {
      method: 'GET',
      headers: {
        'x-trace': 'trace-2',
        'x-optional': undefined
      } as unknown as HeadersInit
    });

    await new Promise((r) => setTimeout(r, 0));
    tokenStore.set('fresh-token-2');
    resolveRefresh('fresh-token-2');

    await Promise.all([req1, req2]);

    expect(mockFetch).toHaveBeenCalledTimes(4);
    const queuedRetryCall = mockFetch.mock.calls.slice(2).find(([url]) =>
      String(url).includes('/api/v1/employees')
    );
    expect(queuedRetryCall).toBeDefined();
    const queuedRetryHeaders = queuedRetryCall![1].headers as Headers;
    expect(queuedRetryHeaders.get('Authorization')).toBe('Bearer fresh-token-2');
    expect(queuedRetryHeaders.get('x-trace')).toBe('trace-2');
    expect(queuedRetryHeaders.has('x-optional')).toBe(false);
  });

  describe('auth-store + fetcher integration (idle tab resume, single-flight, error classification & logging)', () => {
    let mockNavigate: jest.Mock;

    beforeEach(() => {
      mockNavigate = jest.fn();
      resetAuthStoreRuntimeForTesting(mockNavigate);
      useAuthStore.setState({
        user: { id: 'u-1', username: 'alice' } as User,
        loading: false,
        initialized: true,
        refreshPromise: null,
        refreshCircuitState: 'closed',
        refreshCooldownUntil: 0,
        refreshFailureCount: 0
      });
      tokenStore.set('expired-access-token');
      setRefreshHandler(() => useAuthStore.getState().refresh());
    });

    afterEach(() => {
      useAuthStore.setState({
        user: null,
        loading: false,
        initialized: false,
        refreshPromise: null,
        refreshCircuitState: 'closed',
        refreshCooldownUntil: 0,
        refreshFailureCount: 0
      });
      resetAuthStoreRuntimeForTesting();
      jest.restoreAllMocks();
    });

    it('resumes after idle tab: concurrent 401 requests share a single /auth/refresh call and retry once', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      const mockFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const authHeader = (init?.headers as Headers | undefined)?.get('Authorization');

        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(200, {
            data: { access_token: 'rotated-access-token', expires_in: 1800 }
          });
        }

        if (authHeader !== 'Bearer rotated-access-token') {
          return makeJsonResponse(401, {
            error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
          });
        }

        if (url.includes('/api/v1/platform-notifications/my-notifications')) {
          return makeJsonResponse(200, { data: [] });
        }
        return makeJsonResponse(200, { data: { id: 'emp-1' } });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const [notifRes, empRes] = await Promise.all([
        customFetch('/api/v1/platform-notifications/my-notifications', { method: 'GET' }),
        customFetch('/api/v1/employees', { method: 'GET' })
      ]);

      expect((notifRes as { status: number }).status).toBe(200);
      expect((empRes as { status: number }).status).toBe(200);

      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/auth/refresh')
      );
      expect(refreshCalls).toHaveLength(1);
      expect(tokenStore.get()).toBe('rotated-access-token');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('retries original request at most once and stops if retry still returns 401', async () => {
      const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(200, {
            data: { access_token: 'still-rejected-token', expires_in: 1800 }
          });
        }
        return makeJsonResponse(401, {
          error: { code: 'UNAUTHORIZED', message: 'Still unauthorized' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(customFetch('/api/v1/employees', { method: 'GET' })).rejects.toMatchObject({
        status: 401
      });

      const employeeCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/employees')
      );
      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/auth/refresh')
      );
      expect(employeeCalls).toHaveLength(2);
      expect(refreshCalls).toHaveLength(1);
    });

    it('clears state and logs warn once (never console.error) when refresh fails with 401', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(401, {
            error: {
              code: 'REFRESH_TOKEN_EXPIRED',
              message: 'Refresh token expired'
            }
          });
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(
        Promise.allSettled([
          customFetch('/api/v1/platform-notifications/my-notifications', { method: 'GET' }),
          customFetch('/api/v1/employees', { method: 'GET' })
        ])
      ).resolves.toEqual([
        expect.objectContaining({ status: 'rejected' }),
        expect.objectContaining({ status: 'rejected' })
      ]);

      expect(useAuthStore.getState().user).toBeNull();
      expect(tokenStore.get()).toBeNull();
      // Even if clearState() is invoked again, redirect to /auth/sign-in happens only once
      useAuthStore.getState().clearState();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/auth/sign-in');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'auth_refresh_failed',
        expect.objectContaining({
          source: 'auth-store',
          reason: 'unauthorized',
          status: 401
        })
      );
    });

    it('halts refresh loop via circuit-breaker, preserves session, and logs warn once on 403 CSRF rejection', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(403, {
            error: {
              code: 'FORBIDDEN',
              message: 'Cross-origin cookie-authenticated refresh blocked (CSRF protection)',
              details: {
                reason: 'CSRF_ORIGIN_MISMATCH',
                origin: 'http://192.168.1.25:8080'
              }
            }
          });
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(
        customFetch('/api/v1/platform-notifications/my-notifications', { method: 'GET' })
      ).rejects.toMatchObject({
        status: 403,
        details: { reason: 'CSRF_ORIGIN_MISMATCH' }
      });

      // Second polling tick must trip circuit-breaker without calling /auth/refresh again or logging again
      await expect(
        customFetch('/api/v1/platform-notifications/my-notifications', { method: 'GET' })
      ).rejects.toMatchObject({
        status: 403,
        details: { reason: 'CSRF_ORIGIN_MISMATCH' }
      });

      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/auth/refresh')
      );
      expect(refreshCalls).toHaveLength(1);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(useAuthStore.getState().refreshCircuitState).toBe('open:csrf');
      expect(
        Boolean(useAuthStore.getState().user?.id) &&
          useAuthStore.getState().refreshCircuitState === 'closed'
      ).toBe(false);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'auth_refresh_failed',
        expect.objectContaining({
          source: 'auth-store',
          reason: 'csrf_blocked',
          errorReason: 'CSRF_ORIGIN_MISMATCH',
          status: 403
        })
      );
    });

    it('recovers without page reload or re-login after circuit-breaker cooldown or recoverSession()', async () => {
      jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      let proxyFixed = false;
      const mockFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          if (!proxyFixed) {
            return makeJsonResponse(403, {
              error: {
                code: 'FORBIDDEN',
                message: 'Cross-origin cookie-authenticated refresh blocked (CSRF protection)',
                details: {
                  reason: 'CSRF_ORIGIN_MISMATCH',
                  origin: 'http://192.168.1.25:8080'
                }
              }
            });
          }
          return makeJsonResponse(200, {
            data: { access_token: 'recovered-after-csrf-fix', expires_in: 1800 }
          });
        }
        const authHeader = (init?.headers as Headers | undefined)?.get('Authorization');
        if (authHeader === 'Bearer recovered-after-csrf-fix') {
          return makeJsonResponse(200, { data: [{ id: 'n-1' }] });
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      // 1. First call trips CSRF circuit-breaker
      await expect(
        customFetch('/api/v1/platform-notifications/my-notifications', { method: 'GET' })
      ).rejects.toMatchObject({ status: 403 });
      expect(useAuthStore.getState().refreshCircuitState).toBe('open:csrf');

      // 2. Proxy config is fixed while app is still open; cooldown expires (half-open probe)
      proxyFixed = true;
      useAuthStore.setState({ refreshCooldownUntil: Date.now() - 1 });

      const recoveredRes = await customFetch('/api/v1/platform-notifications/my-notifications', {
        method: 'GET'
      });
      expect((recoveredRes as { status: number }).status).toBe(200);
      expect(useAuthStore.getState().refreshCircuitState).toBe('closed');
      expect(tokenStore.get()).toBe('recovered-after-csrf-fix');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not trigger refresh or clear session on non-session 401 (e.g. wrong current password in change-password)', async () => {
      const mockFetch = jest.fn(async () =>
        makeJsonResponse(401, {
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Sai mật khẩu hiện tại',
            details: { reason: 'INVALID_CREDENTIALS' }
          }
        })
      );
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(
        customFetch('/api/v1/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'new-password-123' })
        })
      ).rejects.toMatchObject({
        status: 401,
        backendCode: 'AUTH_INVALID_CREDENTIALS'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not clear session on non-CSRF 403 Forbidden during refresh and logs warn once', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(403, {
            error: {
              code: 'FORBIDDEN',
              message: 'IP restricted by policy'
            }
          });
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(customFetch('/api/v1/employees', { method: 'GET' })).rejects.toMatchObject({
        status: 403
      });

      expect(useAuthStore.getState().user).not.toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'auth_refresh_failed',
        expect.objectContaining({
          source: 'auth-store',
          reason: 'forbidden',
          status: 403
        })
      );
    });

    it('respects Retry-After header on 429 rate-limited refresh without clearing session', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation(() => {});

      const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          return makeJsonResponse(
            429,
            {
              error: {
                code: 'RATE_LIMITED',
                message: 'Too Many Requests'
              }
            },
            { 'retry-after': '45' }
          );
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Access token expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(customFetch('/api/v1/employees', { method: 'GET' })).rejects.toMatchObject({
        status: 429,
        retryAfterMs: 45_000
      });

      // Immediate second call during cooldown must not hit /auth/refresh again
      await expect(customFetch('/api/v1/employees', { method: 'GET' })).rejects.toMatchObject({
        status: 429
      });

      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/auth/refresh')
      );
      expect(refreshCalls).toHaveLength(1);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'auth_refresh_failed',
        expect.objectContaining({
          source: 'auth-store',
          reason: 'rate_limited',
          retryAfterMs: 45_000,
          status: 429
        })
      );
    });

    it('recovers from transient 503 during refresh without clearing session', async () => {
      const errorSpy = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
      let refreshAttempt = 0;

      const mockFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/refresh')) {
          refreshAttempt += 1;
          if (refreshAttempt === 1) {
            return makeJsonResponse(503, {
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Temporarily unavailable' }
            });
          }
          return makeJsonResponse(200, {
            data: { access_token: 'recovered-token', expires_in: 1800 }
          });
        }
        const authHeader = (init?.headers as Headers | undefined)?.get('Authorization');
        if (authHeader === 'Bearer recovered-token') {
          return makeJsonResponse(200, { data: { ok: true } });
        }
        return makeJsonResponse(401, {
          error: { code: 'AUTH_TOKEN_INVALID', message: 'Expired' }
        });
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const res = await customFetch('/api/v1/employees', { method: 'GET' });
      expect((res as { status: number }).status).toBe(200);
      expect(refreshAttempt).toBe(2);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('schedules proactive refresh on hydrateFromServer (after F5/SSR) so access_token cookie never expires silently', async () => {
      jest.useFakeTimers();
      try {
        tokenStore.clear();

        let refreshCalls = 0;
        const mockFetch = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes('/api/v1/auth/refresh')) {
            refreshCalls += 1;
            return makeJsonResponse(200, {
              data: { access_token: 'proactive-ssr-token', expires_in: 1800 }
            });
          }
          return makeJsonResponse(200, { data: { ok: true } });
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        useAuthStore.getState().hydrateFromServer(
          {
            id: 'u-ssr',
            username: 'admin',
            email: 'admin@example.com',
            roles: ['admin'],
            permissions: []
          } as unknown as User,
          100
        );

        // At 80% of 100s (80_000ms), proactive refresh fires automatically
        await jest.advanceTimersByTimeAsync(80_000);
        expect(refreshCalls).toBe(1);
        expect(tokenStore.get()).toBe('proactive-ssr-token');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
