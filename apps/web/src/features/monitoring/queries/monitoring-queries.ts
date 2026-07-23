import { useQuery } from '@tanstack/react-query';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { customFetch } from '@/lib/fetcher';
import { unwrapData, extractPagination } from '@/lib/api-extract';

const monitoringKeys = createKeyFactory('monitoring');

export type ActivityItem = {
  id: string;
  action: string;
  actorName?: string | null;
  entity: string;
  entityId?: string | null;
  createdAt: string;
};

export type DataIntegrityIssue = {
  domain: string;
  severity: string;
  count: number;
  message?: string;
  description?: string;
  recommendation?: string;
};

export type DataIntegrityResult = {
  totalIssues: number;
  criticalCount: number;
  checkedAt: string;
  issues: DataIntegrityIssue[];
};

export function useSystemHealthQuery() {
  return useQuery({
    queryKey: monitoringKeys.detail('system-health'),
    queryFn: async ({ signal }) => {
      const res = await customFetch<any>('/api/v1/system-health', { signal });
      return unwrapData<any>(res);
    },
    ...queryPolicyPresets.monitoring,
    refetchInterval: 30_000,
  });
}

export function useActivitiesQuery(params?: { page?: number; limit?: number; action?: string; entity?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.action) searchParams.set('action', params.action);
  if (params?.entity) searchParams.set('entity', params.entity);

  const qs = searchParams.toString();
  const url = `/api/v1/activities${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: [...monitoringKeys.lists(), 'activities', params],
    queryFn: async ({ signal }) => {
      const res = await customFetch<unknown>(url, { signal });
      return { activities: unwrapData<ActivityItem[]>(res), pagination: extractPagination(res) };
    },
    ...queryPolicyPresets.monitoring,
  });
}

export function useDataIntegrityQuery() {
  return useQuery({
    queryKey: monitoringKeys.detail('data-integrity'),
    queryFn: async ({ signal }) => {
      const res = await customFetch<unknown>('/api/v1/data-integrity', { signal });
      return unwrapData<DataIntegrityResult>(res);
    },
    ...queryPolicyPresets.monitoring,
  });
}

export function useActivityActionsQuery() {
  return useQuery({
    queryKey: [...monitoringKeys.lists(), 'actions'],
    queryFn: async ({ signal }) => {
      const res = await customFetch<any>('/api/v1/activities/actions', { signal });
      return unwrapData<any>(res);
    },
    staleTime: 5 * 60_000,
  });
}

export function useActivityEntitiesQuery() {
  return useQuery({
    queryKey: [...monitoringKeys.lists(), 'entities'],
    queryFn: async ({ signal }) => {
      const res = await customFetch<any>('/api/v1/activities/entities', { signal });
      return unwrapData<any>(res);
    },
    staleTime: 5 * 60_000,
  });
}
