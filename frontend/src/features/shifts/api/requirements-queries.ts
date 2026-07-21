import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { unwrapData } from '@/lib/api-extract';
import { toast } from 'sonner';
import { feedbackCopy } from '@/lib/feedback-copy';

const BASE = '/api/v1/workforce/schedules';

export interface ScheduleRequirement {
  id: string;
  locationId: string | null;
  workRoleId: string | null;
  shiftTemplateId: string | null;
  requiredCount: number;
  locationName?: string;
  workRoleName?: string;
  shiftTemplateName?: string;
}

export interface RequirementInput {
  locationId?: string | null;
  workRoleId?: string | null;
  shiftTemplateId?: string | null;
  requiredCount: number;
}

const reqKeys = createKeyFactory<{ date: string }>('schedule-requirements');

export function requirementsQueryOptions(date: string) {
  return queryOptions({
    queryKey: reqKeys.list({ date }),
    queryFn: async () => {
      const res = await customFetch(`${BASE}/dates/${date}/requirements`);
      return unwrapData<{ scheduleId: string; rows: ScheduleRequirement[] }>(res);
    },
    ...queryPolicyPresets['default'],
  });
}

export function useRequirements(date: string) {
  return useQuery(requirementsQueryOptions(date));
}

export function useReplaceRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, requirements }: { date: string; requirements: RequirementInput[] }) => {
      const res = await customFetch(`${BASE}/dates/${date}/requirements`, {
        method: 'PUT',
        body: JSON.stringify(requirements),
      });
      return unwrapData<{ scheduleId: string; rows: ScheduleRequirement[] }>(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: reqKeys.list({ date: vars.date }) });
      toast.success(feedbackCopy.success.saved('định biên'));
    },
  });
}
