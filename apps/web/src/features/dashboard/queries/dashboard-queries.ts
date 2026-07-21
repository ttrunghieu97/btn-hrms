import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

export interface DashboardWidgetDto<TData = unknown> {
  id: string;
  version: number;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'list' | 'timeline';
  category: string;
  generatedAt: string;
  executionTimeMs: number;
  data: TData;
}

export interface DashboardMetaDto {
  generatedAt: string;
  durationMs: number;
  failedWidgets: string[];
  widgetCount: number;
}

export interface DashboardResponseEnvelope {
  widgets: DashboardWidgetDto[];
  meta: DashboardMetaDto;
}

const dashboardKeys = createKeyFactory('dashboard');

export function useDashboardQuery() {
  return useQuery({
    queryKey: dashboardKeys.detail('widgets'),
    queryFn: async ({ signal }) => {
      const res = await customFetch<DashboardResponseEnvelope>(
        '/api/v1/dashboard',
        { signal },
      );
      return unwrapData<DashboardResponseEnvelope>(res);
    },
    ...queryPolicyPresets['dashboard'],
  });
}
export const useDashboardOverviewQuery = useDashboardQuery;
