'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';

export interface PeriodLockData {
  id: string;
  period: string;
  status: 'draft' | 'in_review' | 'locked' | 'closed';
  lockedByUserId?: string | null;
  lockedAt?: string | null;
  unlockedByUserId?: string | null;
  unlockedAt?: string | null;
  remarks?: string | null;
}

export interface PeriodTransitionRecord {
  id: string;
  period: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  performedByUserId: string;
  performedAt: string;
  remarks?: string | null;
}

const PERIOD_LOCK_KEY = (period: string) => ['/api/v1/timekeeping/period-locks', period] as const;
const PERIOD_HISTORY_KEY = (period: string) => ['/api/v1/timekeeping/period-locks', period, 'history'] as const;

export async function fetchPeriodLock(period: string): Promise<PeriodLockData | null> {
  const res = await customFetch<any>(`/api/v1/timekeeping/period-locks/${period}`);
  const unwrapped = unwrapData<any>(res);
  return unwrapped ?? null;
}

export async function fetchPeriodHistory(period: string): Promise<PeriodTransitionRecord[]> {
  const res = await customFetch<any>(`/api/v1/timekeeping/period-locks/${period}/history`);
  const unwrapped = unwrapData<PeriodTransitionRecord[]>(res);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export function usePeriodLockQuery(period: string) {
  return useQuery({
    queryKey: PERIOD_LOCK_KEY(period),
    queryFn: () => fetchPeriodLock(period),
    enabled: Boolean(period),
  });
}

export function usePeriodHistoryQuery(period: string) {
  return useQuery({
    queryKey: PERIOD_HISTORY_KEY(period),
    queryFn: () => fetchPeriodHistory(period),
    enabled: Boolean(period),
  });
}

export function usePeriodActionMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      period,
      remarks,
    }: {
      action: 'review' | 'lock' | 'approve' | 'close' | 'unlock' | 'reopen';
      period: string;
      remarks?: string;
    }) => {
      const res = await customFetch<any>(`/api/v1/timekeeping/period-locks/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, remarks }),
      });
      return unwrapData<PeriodLockData>(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: PERIOD_LOCK_KEY(vars.period) });
      qc.invalidateQueries({ queryKey: PERIOD_HISTORY_KEY(vars.period) });
      qc.invalidateQueries({ queryKey: ['/api/v1/timekeeping'] });
      notifyMutationSuccess('Cập nhật trạng thái kỳ công thành công');
    },
    onError: (err) => {
      notifyMutationError(err, 'Thao tác kỳ công thất bại');
    },
  });
}
