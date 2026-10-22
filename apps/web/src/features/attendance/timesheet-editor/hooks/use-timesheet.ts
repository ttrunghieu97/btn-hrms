import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { timekeepingControllerGetTimesheetWorkspace } from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import { unwrapData } from '@/lib/api-extract';
import {
  type TimesheetWorkspaceEmployee,
  type TimesheetWorkspaceRecord,
  type TimesheetWorkspacePeriodTotals,
  type TimesheetWorkspaceResponse,
  type PeriodStatus,
} from '../types';

const EMPTY_EMPLOYEES: TimesheetWorkspaceEmployee[] = [];
const EMPTY_RECORDS: TimesheetWorkspaceRecord[] = [];
const EMPTY_ACTIONS: string[] = [];

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
  const [period, setPeriod] = useState(() => {
    if (initialPeriod) return initialPeriod;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [prevInitialPeriod, setPrevInitialPeriod] = useState(initialPeriod);

  if (initialPeriod !== prevInitialPeriod) {
    setPrevInitialPeriod(initialPeriod);
    if (initialPeriod && initialPeriod !== period) {
      setPeriod(initialPeriod);
    }
  }

  const query = useQuery({
    queryKey: getTimesheetWorkspaceQueryKey(period),
    queryFn: async ({ signal }) => {
      const res = await timekeepingControllerGetTimesheetWorkspace(
        { period },
        { signal },
      );
      return unwrapData<TimesheetWorkspaceResponse>(res);
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getTimesheetWorkspaceQueryKey(period),
    });
  }, [queryClient, period]);

  const data = query.data;
  const isPlaceholder = query.isPlaceholderData;
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
    employees: data?.employees ?? EMPTY_EMPLOYEES,
    records: isPlaceholder ? EMPTY_RECORDS : (data?.records ?? EMPTY_RECORDS),
    periodStatus: data?.periodStatus ?? null,
    availableActions: data?.availableActions ?? EMPTY_ACTIONS,
    totals: data?.totals ?? null,
    period,
    reload,
    setPeriod,
  };
}
