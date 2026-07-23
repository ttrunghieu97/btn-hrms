import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('performance mutations', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useCreatePerformanceCycle', () => {
    it('creates cycle', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'c1', name: 'H1 2026', status: 'draft' },
        status: 201, headers: new Headers(),
      });
      const { useCreatePerformanceCycle } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePerformanceCycle(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ name: 'H1 2026', startsOn: '2026-01-01', endsOn: '2026-06-30' } as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Validation failed'));
      const { useCreatePerformanceCycle } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePerformanceCycle(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ name: '' } as any); });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useTransitionCycle', () => {
    it('activates cycle', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'c1', status: 'active' },
        status: 200, headers: new Headers(),
      });
      const { useTransitionCycle } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useTransitionCycle(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ id: 'c1', action: 'activate' } as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('rejects invalid transition', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Invalid transition'));
      const { useTransitionCycle } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useTransitionCycle(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ id: 'c1', action: 'complete' } as any); });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreatePerformanceGoal', () => {
    it('creates goal', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'g1', title: 'Goal 1', status: 'draft' },
        status: 201, headers: new Headers(),
      });
      const { useCreatePerformanceGoal } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePerformanceGoal(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ cycleId: 'c1', title: 'Goal 1' } as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
