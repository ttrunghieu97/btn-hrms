import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('benefits queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('benefitPlansQueryOptions', () => {
    it('fetches plans list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: [{ id: 'p1', name: 'Health', status: 'active' }],
        status: 200, headers: new Headers(),
      });
      const { benefitPlansQueryOptions } = await import('./queries');
      const { result } = renderHook(() => useQuery(benefitPlansQueryOptions({})), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: [], status: 200, headers: new Headers() });
      const { benefitPlansQueryOptions } = await import('./queries');
      const { result } = renderHook(() => useQuery(benefitPlansQueryOptions({})), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));
      const { benefitPlansQueryOptions } = await import('./queries');
      const { result } = renderHook(() => useQuery(benefitPlansQueryOptions({})), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('benefitPlanDetailQueryOptions', () => {
    it('fetches detail', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: { id: 'p1', name: 'Health' }, status: 200, headers: new Headers() });
      const { benefitPlanDetailQueryOptions } = await import('./queries');
      const { result } = renderHook(() => useQuery(benefitPlanDetailQueryOptions('p1')), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('benefitEnrollmentsQueryOptions', () => {
    it('fetches enrollments', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: [{ id: 'e1', status: 'active' }], status: 200, headers: new Headers() });
      const { benefitEnrollmentsQueryOptions } = await import('./queries');
      const { result } = renderHook(() => useQuery(benefitEnrollmentsQueryOptions({})), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
