import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { createPayrollPeriodFactory, createPayrollRunFactory } from '@/test/factories/payroll.factory';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));

const { customFetch } = jest.requireMock('@/lib/fetcher');

const period = createPayrollPeriodFactory();
const run = createPayrollRunFactory();

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('payroll periods', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('usePayrollPeriodsQuery', () => {
    it('fetches periods list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [period], page: 1, limit: 10, total: 1 },
        status: 200, headers: new Headers(),
      });

      const { usePayrollPeriodsQuery } = await import('./period-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollPeriodsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles empty list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [], page: 1, limit: 10, total: 0 },
        status: 200, headers: new Headers(),
      });

      const { usePayrollPeriodsQuery } = await import('./period-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollPeriodsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { usePayrollPeriodsQuery } = await import('./period-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollPeriodsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('usePayrollPeriodQuery', () => {
    it('fetches period detail', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: period,
        status: 200, headers: new Headers(),
      });

      const { usePayrollPeriodQuery } = await import('./period-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollPeriodQuery('period-1'),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('disabled when id is undefined', async () => {
      const { usePayrollPeriodQuery } = await import('./period-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollPeriodQuery(undefined),
        { wrapper: Wrapper },
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCreatePayrollPeriodMutation', () => {
    it('creates period', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: period, status: 201, headers: new Headers(),
      });

      const { useCreatePayrollPeriodMutation } = await import('./period-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePayrollPeriodMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ code: 'P2026-01', name: 'Period 1' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles creation error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Duplicate'));

      const { useCreatePayrollPeriodMutation } = await import('./period-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePayrollPeriodMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ code: 'P2026-01', name: 'Period 1' } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe('payroll runs', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('usePayrollRunsQuery', () => {
    it('fetches runs list', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { rows: [run], page: 1, limit: 10, total: 1 },
        status: 200, headers: new Headers(),
      });

      const { usePayrollRunsQuery } = await import('./payroll-run-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollRunsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { usePayrollRunsQuery } = await import('./payroll-run-queries');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePayrollRunsQuery({ page: 1, limit: 10 }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useGeneratePayrollRunMutation', () => {
    it('generates run', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'run-1', status: 'processing' },
        status: 200, headers: new Headers(),
      });

      const { useGeneratePayrollRunMutation } = await import('./payroll-run-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useGeneratePayrollRunMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ payrollPeriodId: 'period-1' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles generation error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Missing data'));

      const { useGeneratePayrollRunMutation } = await import('./payroll-run-queries');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useGeneratePayrollRunMutation(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ payrollPeriodId: 'period-1' } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
