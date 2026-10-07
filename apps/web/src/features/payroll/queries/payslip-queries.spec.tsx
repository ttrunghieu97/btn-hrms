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

describe('payslip queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('usePayslipsQuery', () => {
    it('fetches payslips list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [{
          id: 'payslip-1',
          employeeId: 'emp-1',
          employeeName: 'Nguyen Van A',
          grossAmount: 15000000,
          netAmount: 12000000,
          status: 'draft',
        }], page: 1, limit: 10, total: 1 },
        status: 200, headers: new Headers(),
      });

      const { usePayslipsQuery } = await import('./payslip-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayslipsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [], page: 1, limit: 10, total: 0 },
        status: 200, headers: new Headers(),
      });

      const { usePayslipsQuery } = await import('./payslip-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayslipsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { usePayslipsQuery } = await import('./payslip-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayslipsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('usePublishPayslipMutation', () => {
    it('publishes payslip', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'payslip-1', status: 'published' },
        status: 200, headers: new Headers(),
      });

      const { usePublishPayslipMutation } = await import('./payslip-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => usePublishPayslipMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 'payslip-1' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles publish error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Already published'));

      const { usePublishPayslipMutation } = await import('./payslip-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => usePublishPayslipMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ id: 'payslip-1' } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
