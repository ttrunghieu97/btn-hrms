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

describe('onboarding queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('onboardingProcessesQueryOptions', () => {
    it('fetches processes list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [{ id: 'p1', status: 'draft' }], pagination: { page: 1, limit: 20, total: 1 } },
        status: 200, headers: new Headers(),
      });

      const { onboardingProcessesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingProcessesQueryOptions(1, 20)),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [], pagination: { page: 1, limit: 20, total: 0 } },
        status: 200, headers: new Headers(),
      });

      const { onboardingProcessesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingProcessesQueryOptions(1, 20)),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { onboardingProcessesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingProcessesQueryOptions(1, 20)),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('onboardingTemplatesQueryOptions', () => {
    it('fetches templates', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: [{ id: 't1', name: 'Standard' }],
        status: 200, headers: new Headers(),
      });

      const { onboardingTemplatesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingTemplatesQueryOptions()),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { onboardingTemplatesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingTemplatesQueryOptions()),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('onboardingProcessDetailQueryOptions', () => {
    it('fetches process detail', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'p1', status: 'active' },
        status: 200, headers: new Headers(),
      });

      const { onboardingProcessDetailQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(onboardingProcessDetailQueryOptions('p1')),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
