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

describe('performance queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('performanceCyclesQueryOptions', () => {
    it('fetches cycles list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: [{ id: 'c1', name: 'Cycle 1', status: 'active' }],
        status: 200, headers: new Headers(),
      });
      const { performanceCyclesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceCyclesQueryOptions({})),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: [], status: 200, headers: new Headers() });
      const { performanceCyclesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceCyclesQueryOptions({})),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));
      const { performanceCyclesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceCyclesQueryOptions({})),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('performanceCycleDetailQueryOptions', () => {
    it('fetches cycle detail', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: { id: 'c1', status: 'active' }, status: 200, headers: new Headers() });
      const { performanceCycleDetailQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceCycleDetailQueryOptions('c1')),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('performanceGoalsQueryOptions', () => {
    it('fetches goals', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: [{ id: 'g1', title: 'Goal 1' }], status: 200, headers: new Headers() });
      const { performanceGoalsQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceGoalsQueryOptions('c1')),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('performanceReviewsQueryOptions', () => {
    it('fetches reviews', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: [{ id: 'r1', status: 'pending' }], status: 200, headers: new Headers() });
      const { performanceReviewsQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(performanceReviewsQueryOptions('c1', {})),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
