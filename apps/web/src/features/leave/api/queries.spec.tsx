import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/api/generated/endpoints', () => ({
  leaveManagementControllerList: jest.fn(),
  leaveManagementControllerListBalances: jest.fn(),
  leaveAdminControllerListPolicies: jest.fn(),
  leaveAdminControllerListTypes: jest.fn(),
  useLeaveManagementControllerCreate: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useLeaveManagementControllerCancel: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const {
  leaveManagementControllerList,
  leaveManagementControllerListBalances,
  leaveAdminControllerListPolicies,
  leaveAdminControllerListTypes,
} = jest.requireMock('@/api/generated/endpoints');

const mockLeaveRequest = {
  id: 'leave-1',
  employeeId: 'emp-1',
  employeeName: 'Nguyen Van A',
  leaveTypeId: 'type-1',
  leaveTypeName: 'Annual Leave',
  status: 'pending',
  startDate: '2026-08-01',
  endDate: '2026-08-01',
  reason: 'Personal leave',
  createdAt: '2026-07-20T00:00:00Z',
};

const mockLeaves = [mockLeaveRequest];

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('leave queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('leaveRequestsQueryOptions', () => {
    beforeEach(() => {
      (leaveManagementControllerList as jest.Mock).mockResolvedValue({
        data: { data: mockLeaves, error: null },
        status: 200,
        headers: new Headers(),
      });
    });

    it('fetches leave requests list', async () => {
      const { leaveRequestsQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(leaveRequestsQueryOptions({ page: 1, limit: 10 })),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(leaveManagementControllerList).toHaveBeenCalled();
    });

    it('returns empty list when no leaves', async () => {
      (leaveManagementControllerList as jest.Mock).mockResolvedValue({
        data: { data: [], error: null },
        status: 200,
        headers: new Headers(),
      });

      const { leaveRequestsQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(leaveRequestsQueryOptions({ page: 1, limit: 10 })),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles API error', async () => {
      (leaveManagementControllerList as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      const { leaveRequestsQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(leaveRequestsQueryOptions({ page: 1, limit: 10 })),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('myLeaveBalancesQueryOptions', () => {
    beforeEach(() => {
      (leaveManagementControllerListBalances as jest.Mock).mockResolvedValue({
        data: { data: { annual: 12, sick: 10, personal: 5 }, error: null },
        status: 200,
        headers: new Headers(),
      });
    });

    it('fetches leave balances for employee', async () => {
      const { myLeaveBalancesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(myLeaveBalancesQueryOptions('emp-1')),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(leaveManagementControllerListBalances).toHaveBeenCalledWith('emp-1');
    });

    it('is disabled when no employeeId', async () => {
      const { myLeaveBalancesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(myLeaveBalancesQueryOptions()),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('handles balance fetch error', async () => {
      (leaveManagementControllerListBalances as jest.Mock).mockRejectedValue(new Error('Balance error'));

      const { myLeaveBalancesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(myLeaveBalancesQueryOptions('emp-1')),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('leavePoliciesQueryOptions', () => {
    beforeEach(() => {
      (leaveAdminControllerListPolicies as jest.Mock).mockResolvedValue({
        data: { data: [{ id: 'policy-1', name: 'Standard', daysAllowed: 12 }], error: null },
        status: 200,
        headers: new Headers(),
      });
    });

    it('fetches leave policies', async () => {
      const { leavePoliciesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(leavePoliciesQueryOptions()),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(leaveAdminControllerListPolicies).toHaveBeenCalled();
    });
  });

  describe('leaveTypesQueryOptions', () => {
    beforeEach(() => {
      (leaveAdminControllerListTypes as jest.Mock).mockResolvedValue({
        data: { data: [{ id: 'type-1', name: 'Annual', daysAllowed: 12 }], error: null },
        status: 200,
        headers: new Headers(),
      });
    });

    it('fetches leave types', async () => {
      const { leaveTypesQueryOptions } = await import('./queries');
      const { result } = renderHook(
        () => useQuery(leaveTypesQueryOptions()),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(leaveAdminControllerListTypes).toHaveBeenCalled();
    });
  });
});
