import { queryOptions } from '@tanstack/react-query';
import {
  leaveManagementControllerList,
  leaveManagementControllerListBalances,
  leaveAdminControllerListPolicies,
  leaveAdminControllerListTypes,
} from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { queryPolicyPresets } from '@/lib/query-client';
import { leaveKeys, type LeaveListFilters } from '../queries/leave-queries';

export const leaveRequestsQueryOptions = (filters?: LeaveListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: leaveKeys.list(filters),
    queryFn: () => leaveManagementControllerList(filters),
  });

export const myLeaveBalancesQueryOptions = (employeeId?: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: leaveKeys.balances(employeeId),
    queryFn: () =>
      employeeId ? leaveManagementControllerListBalances(employeeId) : Promise.resolve({ data: [] } as any),
    enabled: !!employeeId,
  });

export const leavePoliciesQueryOptions = () =>
  queryOptions({
    ...queryPolicyPresets['static'],
    queryKey: leaveKeys.policies(),
    queryFn: () => leaveAdminControllerListPolicies(),
  });

export const leaveTypesQueryOptions = () =>
  queryOptions({
    ...queryPolicyPresets['static'],
    queryKey: leaveKeys.types(),
    queryFn: () => leaveAdminControllerListTypes(),
  });
