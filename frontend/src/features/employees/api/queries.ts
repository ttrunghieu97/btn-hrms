import { queryOptions } from '@tanstack/react-query';
import { employeesControllerFindAll } from '@/api/generated/endpoints';
import type {
  EmployeeResponseDto,
  EmployeesControllerFindAllParams,
} from '@/api/generated/model';
import { extractList, extractPagination } from '@/lib/api-extract';
import { queryPolicyPresets } from '@/lib/query-client';
import { employeeKeys } from '../queries/employee-queries';

export type EmployeeFilters = EmployeesControllerFindAllParams & {
  departmentIds?: string[];
};

function toEmployeeParams(filters: EmployeeFilters): EmployeesControllerFindAllParams {
  const params = {
    ...filters,
    includeDeleted: filters.tab === 'deleted' ? true : filters.includeDeleted
  };
  return params as unknown as EmployeesControllerFindAllParams;
}

export interface EmployeesListData {
  employees: EmployeeResponseDto[];
  totalEmployees: number;
}

export { employeeKeys } from '../queries/employee-queries';

export const employeesQueryOptions = (
  filters: EmployeeFilters,
  requestInit?: RequestInit
) =>
  queryOptions({
    queryKey: employeeKeys.list(toEmployeeParams(filters)),
    queryFn: async (): Promise<EmployeesListData> => {
      const response = await employeesControllerFindAll(toEmployeeParams(filters), requestInit);
      const employees = extractList<EmployeeResponseDto>(response);
      const pagination = extractPagination(response);

      return {
        employees,
        totalEmployees: pagination?.total ?? employees.length
      };
    },
    ...queryPolicyPresets['employees']
  });