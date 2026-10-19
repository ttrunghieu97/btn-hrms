'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { attendanceKeys } from '../attendance-keys';

export interface PeriodLockData {
  id: string;
  period: string;
  status: 'draft' | 'open' | 'in_review' | 'locked' | 'payroll_processing' | 'payroll_posted' | 'closed';
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
  changedByUserId?: string;
  createdAt?: string;
  reason?: string | null;
}

export interface PeriodCloseValidationResult {
  valid: boolean;
  reasons: string[];
}

export type ReconciliationDiffType =
  | 'MATCH'
  | 'MISSING_ATTENDANCE_SNAPSHOT'
  | 'MISSING_PAYROLL_INPUT'
  | 'REGULAR_HOURS_MISMATCH'
  | 'OVERTIME_MISMATCH'
  | 'EMPLOYEE_NOT_FOUND'
  | 'DUPLICATE_RECORD';

export interface ReconciliationSummary {
  id: string;
  period: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalEmployees: number;
  matchedCount: number;
  mismatchCount: number;
  checkedByUserId: string | null;
  checkedAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  employeeId: string;
  attendanceRegularHours: number;
  payrollRegularHours: number;
  attendanceOvertimeHours: number;
  payrollOvertimeHours: number;
  diffType: ReconciliationDiffType;
}

const PERIOD_LOCK_KEY = (period: string) => ['/api/v1/timekeeping/period-locks', period] as const;
const PERIOD_HISTORY_KEY = (period: string) => ['/api/v1/timekeeping/period-locks', period, 'history'] as const;
const PERIOD_VALIDATE_CLOSE_KEY = (period: string) =>
  ['/api/v1/timekeeping/period-locks', period, 'validate-close'] as const;
const RECONCILIATION_LIST_KEY = (period: string) => ['/api/v1/timekeeping/reconcile', period] as const;
const RECONCILIATION_MISMATCHES_KEY = (id: string) =>
  ['/api/v1/timekeeping/reconcile', id, 'mismatches'] as const;

export async function fetchPeriodLock(period: string): Promise<PeriodLockData | null> {
  const res = await customFetch<unknown>(`/api/v1/timekeeping/period-locks/${period}`);
  const unwrapped = unwrapData<PeriodLockData | null>(res);
  return unwrapped ?? null;
}

export async function fetchPeriodHistory(period: string): Promise<PeriodTransitionRecord[]> {
  const res = await customFetch<unknown>(`/api/v1/timekeeping/period-locks/${period}/history`);
  const unwrapped = unwrapData<PeriodTransitionRecord[]>(res);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped.map((item) => ({
    ...item,
    action: item.action || `${item.fromStatus} → ${item.toStatus}`,
    performedByUserId: item.performedByUserId ?? item.changedByUserId ?? '',
    performedAt: item.performedAt ?? item.createdAt ?? '',
    remarks: item.remarks ?? item.reason ?? null,
  }));
}

export async function fetchValidatePeriodClose(period: string): Promise<PeriodCloseValidationResult> {
  const res = await customFetch<unknown>(`/api/v1/timekeeping/period-locks/${period}/validate-close`);
  const unwrapped = unwrapData<PeriodCloseValidationResult>(res);
  return unwrapped ?? { valid: true, reasons: [] };
}

export async function fetchReconciliationList(period: string): Promise<ReconciliationSummary[]> {
  const res = await customFetch<unknown>(`/api/v1/timekeeping/reconcile?period=${encodeURIComponent(period)}`);
  const unwrapped = unwrapData<ReconciliationSummary[]>(res);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export async function fetchReconciliationMismatches(id: string): Promise<ReconciliationItem[]> {
  const res = await customFetch<unknown>(`/api/v1/timekeeping/reconcile/${id}/mismatches`);
  const unwrapped = unwrapData<ReconciliationItem[]>(res);
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

export function useValidatePeriodCloseQuery(period: string, enabled = true) {
  return useQuery({
    queryKey: PERIOD_VALIDATE_CLOSE_KEY(period),
    queryFn: () => fetchValidatePeriodClose(period),
    enabled: Boolean(period) && enabled,
  });
}

export function useReconciliationListQuery(period: string) {
  return useQuery({
    queryKey: RECONCILIATION_LIST_KEY(period),
    queryFn: () => fetchReconciliationList(period),
    enabled: Boolean(period),
  });
}

export function useReconciliationMismatchesQuery(reconciliationId: string | null) {
  return useQuery({
    queryKey: RECONCILIATION_MISMATCHES_KEY(reconciliationId ?? ''),
    queryFn: () => fetchReconciliationMismatches(reconciliationId!),
    enabled: Boolean(reconciliationId),
  });
}

export function useRunReconciliationMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ period }: { period: string }) => {
      const res = await customFetch<unknown>('/api/v1/timekeeping/reconcile/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      return unwrapData<ReconciliationSummary>(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: RECONCILIATION_LIST_KEY(vars.period) });
      notifyMutationSuccess('Đã chạy đối soát dữ liệu công - lương');
    },
    onError: (err) => {
      notifyMutationError(err, 'Không thể chạy đối soát công - lương');
    },
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
      const res = await customFetch<unknown>(`/api/v1/timekeeping/period-locks/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, remarks }),
      });
      return unwrapData<PeriodLockData>(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: PERIOD_LOCK_KEY(vars.period) });
      qc.invalidateQueries({ queryKey: PERIOD_HISTORY_KEY(vars.period) });
      qc.invalidateQueries({ queryKey: PERIOD_VALIDATE_CLOSE_KEY(vars.period) });
      qc.invalidateQueries({ queryKey: ['/api/v1/timekeeping'] });
      qc.invalidateQueries({ queryKey: attendanceKeys.timesheet.all() });
      notifyMutationSuccess('Cập nhật trạng thái kỳ công thành công');
    },
    onError: (err) => {
      notifyMutationError(err, 'Thao tác kỳ công thất bại');
    },
  });
}

