import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timekeepingControllerGetTimesheetWorkspace } from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import { unwrapData } from '@/lib/api-extract';
import {
  type TimesheetWorkspaceEmployee,
  type TimesheetWorkspaceRecord,
  type TimesheetWorkspacePeriodTotals,
  type TimesheetWorkspaceResponse,
  type PeriodStatus,
} from '../types';

export interface TimesheetState {
  loading: boolean;
  error: string | null;
  errorObject: unknown;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
  periodStatus: PeriodStatus | null;
  availableActions: string[];
  totals: TimesheetWorkspacePeriodTotals | null;
  period: string;
  reload: () => Promise<void>;
  setPeriod: (period: string) => void;
}

export const getTimesheetWorkspaceQueryKey = (period: string) =>
  ['/api/v1/attendances/timekeeping/workspace', { period }] as const;

export function useTimesheet(initialPeriod?: string): TimesheetState {
  const queryClient = useQueryClient();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(initialPeriod ?? defaultPeriod);

  useEffect(() => {
    if (initialPeriod && initialPeriod !== period) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod, period]);

  const query = useQuery({
    queryKey: getTimesheetWorkspaceQueryKey(period),
    queryFn: async () => {
      const res = await timekeepingControllerGetTimesheetWorkspace({ period });
      return unwrapData<TimesheetWorkspaceResponse>(res);
    },
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getTimesheetWorkspaceQueryKey(period),
    });
  }, [queryClient, period]);

  const data = query.data;
  const errorMsg =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? 'Không thể tải dữ liệu bảng công'
        : null;

  return {
    loading: query.isLoading,
    error: errorMsg,
    errorObject: query.error ?? null,
    employees: data?.employees ?? [],
    records: data?.records ?? [],
    periodStatus: data?.periodStatus ?? null,
    availableActions: data?.availableActions ?? [],
    totals: data?.totals ?? null,
    period,
    reload,
    setPeriod,
  };
}
