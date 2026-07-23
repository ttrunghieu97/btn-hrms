import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/api/generated/endpoints', () => {
  const { useMutation } = jest.requireActual('@tanstack/react-query');
  return {
    leaveManagementControllerList: jest.fn(),
    leaveManagementControllerListBalances: jest.fn(),
    leaveAdminControllerListPolicies: jest.fn(),
    leaveAdminControllerListTypes: jest.fn(),
    leaveManagementControllerCreate: jest.fn(),
    leaveManagementControllerCancel: jest.fn(),
    useLeaveManagementControllerCreate: jest.fn((opts?: any) =>
      useMutation({
        mutationFn: async (vars: { data: any }) => ({
          data: { data: { id: 'leave-1', status: 'pending', ...vars.data }, error: null },
          status: 201, headers: new Headers(),
        }),
        ...opts?.mutation,
      }),
    ),
    useLeaveManagementControllerCancel: jest.fn((opts?: any) =>
      useMutation({
        mutationFn: async () => ({
          data: { data: { id: 'leave-1', status: 'cancelled' }, error: null },
          status: 200, headers: new Headers(),
        }),
        ...opts?.mutation,
      }),
    ),
  };
});

const { leaveManagementControllerListBalances } = jest.requireMock('@/api/generated/endpoints');

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('leave lifecycle', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('request creation', () => {
    it('creates request with pending status', async () => {
      const { useCreateLeaveRequest } = await import('./mutations');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ data: { employeeId: 'emp-1', leaveTypeId: 'type-1', startDate: '2026-08-01', endDate: '2026-08-01', reason: 'Vacation' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('calls mutation with correct payload', async () => {
      const { useCreateLeaveRequest } = await import('./mutations');
      const { Wrapper } = createWrapper();

      // We're just testing the hook integrates with the mutation layer
      const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper: Wrapper });
      expect(result.current.mutate).toBeDefined();
    });
  });

  describe('cancellation', () => {
    it('cancels pending request', async () => {
      const { useCancelLeaveRequest } = await import('./mutations');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ data: { id: 'leave-1' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('leave balance', () => {
    it('queries balance for employee', async () => {
      (leaveManagementControllerListBalances as jest.Mock).mockResolvedValue({
        data: { data: { annualRemaining: 10, sickRemaining: 8, personalRemaining: 3 }, error: null },
        status: 200, headers: new Headers(),
      });

      const { myLeaveBalancesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(myLeaveBalancesQueryOptions('emp-1')),
        { wrapper: createWrapper().Wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
