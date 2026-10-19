import { customFetch, normalizeHeaders, setRefreshHandler } from './fetcher';
import { tokenStore } from './token-store';

function makeJsonResponse(status: number, payload: unknown): Response {
  const textBody = JSON.stringify(payload);
  const res = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
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
});
