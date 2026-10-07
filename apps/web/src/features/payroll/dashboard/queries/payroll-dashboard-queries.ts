import { queryOptions, useQuery } from '@tanstack/react-query';
import { payrollKeys } from '../../queries/payroll-keys';
import { getPayrollDashboard } from '../api/payroll-dashboard';

export const payrollDashboardQueryOptions = () =>
  queryOptions({
    queryKey: [...payrollKeys.all, 'dashboard'],
    queryFn: ({ signal }) => getPayrollDashboard(),
  });

export function usePayrollDashboardQuery() {
  return useQuery(payrollDashboardQueryOptions());
}
