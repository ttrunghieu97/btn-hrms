import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { extractList, unwrapData } from '@/lib/api-extract';
import { toast } from 'sonner';

const BASE = '/api/v1/workforce/schedules';

export interface EmployeeQualification {
  employeeId: string;
  positionId: string;
  positionName: string;
  createdAt: string;
}

const qualKeys = createKeyFactory<{ employeeId: string }>('employee-qualifications');

export function qualificationsQueryOptions(employeeId: string) {
  return queryOptions({
    queryKey: qualKeys.list({ employeeId }),
    queryFn: async () => {
      const res = await customFetch(`${BASE}/employees/${employeeId}/qualifications`);
      return extractList<EmployeeQualification>(res);
    },
    ...queryPolicyPresets['default'],
    enabled: !!employeeId,
  });
}

export function useQualifications(employeeId: string) {
  return useQuery(qualificationsQueryOptions(employeeId));
}

export function useReplaceQualifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, positionIds }: { employeeId: string; positionIds: string[] }) => {
      const res = await customFetch(`${BASE}/employees/${employeeId}/qualifications`, {
        method: 'PUT',
        body: JSON.stringify({ positionIds }),
      });
      return unwrapData<EmployeeQualification[]>(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: qualKeys.list({ employeeId: vars.employeeId }) });
      toast.success('Qualifications updated');
    },
  });
}
