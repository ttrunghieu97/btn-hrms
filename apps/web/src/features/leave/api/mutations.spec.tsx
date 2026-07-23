import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import * as React from 'react';

// Mock the generated endpoints module
jest.mock('@/api/generated/endpoints', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  const { useMutation } = actual;

  return {
    // Query stubs
    leaveManagementControllerList: jest.fn(),
    leaveManagementControllerListBalances: jest.fn(),
    leaveAdminControllerListPolicies: jest.fn(),
    leaveAdminControllerListTypes: jest.fn(),

    // Mutation hooks: delegate to real useMutation
    useLeaveManagementControllerCreate: jest.fn((opts?: any) =>
      useMutation({
        mutationFn: async () => ({
          data: { data: { id: 'leave-1', status: 'pending' }, error: null },
          status: 201,
          headers: new Headers(),
        }),
        ...opts?.mutation,
      }),
    ),
    useLeaveManagementControllerCancel: jest.fn((opts?: any) =>
      useMutation({
        mutationFn: async () => ({
          data: { data: { id: 'leave-1', status: 'cancelled' }, error: null },
          status: 200,
          headers: new Headers(),
        }),
        ...opts?.mutation,
      }),
    ),
  };
});

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('leave mutations', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useCreateLeaveRequest', () => {
    it('creates leave request and invalidates cache', async () => {
      const { useCreateLeaveRequest } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();

      // Seed cache
      qc.setQueryData(['leave', 'list'], []);
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ data: { employeeId: 'emp-1', leaveTypeId: 'type-1', startDate: '2026-08-01', endDate: '2026-08-01', reason: 'Vacation' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Verify cache invalidation was triggered
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useCancelLeaveRequest', () => {
    it('cancels leave request and invalidates cache', async () => {
      const { useCancelLeaveRequest } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();

      qc.setQueryData(['leave', 'list'], []);
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ data: { id: 'leave-1' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
