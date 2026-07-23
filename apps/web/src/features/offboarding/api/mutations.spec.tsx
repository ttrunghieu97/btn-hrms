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

describe('offboarding mutations', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useCompleteChecklistItem', () => {
    it('completes checklist item', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { success: true }, status: 200, headers: new Headers(),
      });

      const { useCompleteChecklistItem } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useCompleteChecklistItem(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ processId: 'o1', taskId: 't1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useDecideClearance', () => {
    it('decides clearance', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { success: true }, status: 200, headers: new Headers(),
      });

      const { useDecideClearance } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useDecideClearance(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ processId: 'o1', department: 'IT', decision: 'approved' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles rejection', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Clearance requires IT approval'));

      const { useDecideClearance } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useDecideClearance(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ processId: 'o1', department: 'IT', decision: 'denied' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCompleteOffboarding', () => {
    it('completes process', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { success: true }, status: 200, headers: new Headers(),
      });

      const { useCompleteOffboarding } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteOffboarding(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('o1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles incomplete clearance error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Clearance incomplete'));

      const { useCompleteOffboarding } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteOffboarding(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('o1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
