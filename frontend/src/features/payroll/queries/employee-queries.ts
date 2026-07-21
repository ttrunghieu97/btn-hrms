import { useQuery } from '@tanstack/react-query';
import { payrollKeys } from './payroll-keys';
import { searchEmployees } from '../api/employees';

export function useEmployeeSearchQuery(search: string) {
  return useQuery({
    queryKey: [...payrollKeys.all, 'employee-search', search],
    queryFn: ({ signal }) => searchEmployees(search),
    staleTime: 30_000,
  });
}
