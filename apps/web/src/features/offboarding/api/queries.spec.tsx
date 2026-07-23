import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('offboarding queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useOffboardingList', () => {
    it('fetches offboarding list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [{ id: 'o1', status: 'draft' }], total: 1 },
        status: 200, headers: new Headers(),
      });

      const { useOffboardingList } = await import('../queries/index');
      const { result } = renderHook(() => useOffboardingList(1, 20), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [], total: 0 },
        status: 200, headers: new Headers(),
      });

      const { useOffboardingList } = await import('../queries/index');
      const { result } = renderHook(() => useOffboardingList(1, 20), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { useOffboardingList } = await import('../queries/index');
      const { result } = renderHook(() => useOffboardingList(1, 20), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useOffboardingDetail', () => {
    it('fetches detail', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'o1', status: 'processing' },
        status: 200, headers: new Headers(),
      });

      const { useOffboardingDetail } = await import('../queries/index');
      const { result } = renderHook(() => useOffboardingDetail('o1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('disabled when id empty', async () => {
      const { useOffboardingDetail } = await import('../queries/index');
      const { result } = renderHook(() => useOffboardingDetail(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });
  });
});
