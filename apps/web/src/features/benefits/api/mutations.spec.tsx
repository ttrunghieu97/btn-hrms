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

describe('benefits mutations', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useCreateBenefitPlan', () => {
    it('creates plan', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: { id: 'p1', name: 'Health', status: 'draft' }, status: 201, headers: new Headers() });
      const { useCreateBenefitPlan } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateBenefitPlan(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ name: 'Health', coverageType: 'employee_only' } as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Validation failed'));
      const { useCreateBenefitPlan } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateBenefitPlan(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ name: '' } as any); });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useEnrollEmployee', () => {
    it('enrolls employee', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: { id: 'e1', status: 'active' }, status: 201, headers: new Headers() });
      const { useEnrollEmployee } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useEnrollEmployee(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ planId: 'p1', employeeId: 'emp-1' } as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('rejects duplicate enrollment', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Already enrolled'));
      const { useEnrollEmployee } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useEnrollEmployee(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate({ planId: 'p1', employeeId: 'emp-1' } as any); });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCancelEnrollment', () => {
    it('cancels enrollment', async () => {
      (customFetch as jest.Mock).mockResolvedValue({ data: { id: 'e1', status: 'cancelled' }, status: 200, headers: new Headers() });
      const { useCancelEnrollment } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelEnrollment(), { wrapper: Wrapper });
      await act(async () => { result.current.mutate('e1' as any); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
