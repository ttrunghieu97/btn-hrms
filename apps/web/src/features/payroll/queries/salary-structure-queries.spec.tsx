import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('salary structure queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useSalaryStructuresQuery', () => {
    it('fetches salary structures list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [{ id: 'ss-1', name: 'Standard', basicSalary: 5000000 }], page: 1, limit: 10, total: 1 },
        status: 200, headers: new Headers(),
      });

      const { useSalaryStructuresQuery } = await import('./salary-structure-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useSalaryStructuresQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [], page: 1, limit: 10, total: 0 },
        status: 200, headers: new Headers(),
      });

      const { useSalaryStructuresQuery } = await import('./salary-structure-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useSalaryStructuresQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { useSalaryStructuresQuery } = await import('./salary-structure-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => useSalaryStructuresQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateSalaryStructureMutation', () => {
    it('creates salary structure', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'ss-1', name: 'Standard', basicSalary: 5000000 },
        status: 201, headers: new Headers(),
      });

      const { useCreateSalaryStructureMutation } = await import('./salary-structure-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateSalaryStructureMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ name: 'Standard', basicSalary: 5000000 } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles creation error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Duplicate'));

      const { useCreateSalaryStructureMutation } = await import('./salary-structure-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateSalaryStructureMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ name: 'Standard' } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
