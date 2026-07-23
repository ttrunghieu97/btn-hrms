import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPayrollPeriods, getPayrollPeriod, createPayrollPeriod, updatePayrollPeriod } from '../api/periods';
import { payrollKeys } from './payroll-keys';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { PayrollPeriod, PayrollPeriodListParams, CreatePayrollPeriodPayload, UpdatePayrollPeriodPayload } from '../types';
import type { PayrollPeriodListResponse } from '../api/periods';

export const payrollPeriodsQueryOptions = (params?: PayrollPeriodListParams) =>
  queryOptions({
    queryKey: payrollKeys.periods.list(params as Record<string, unknown>),
    queryFn: (): Promise<PayrollPeriodListResponse> => listPayrollPeriods(params),
  });

export function usePayrollPeriodsQuery(params?: PayrollPeriodListParams) {
  return useQuery(payrollPeriodsQueryOptions(params));
}

export function usePayrollPeriodQuery(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.periods.detail(id!),
    queryFn: (): Promise<PayrollPeriod> => getPayrollPeriod(id!),
    enabled: !!id,
  });
}

export function useCreatePayrollPeriodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayrollPeriodPayload) => createPayrollPeriod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods.lists() });
      notifyMutationSuccess(feedbackCopy.success.created(feedbackEntity.payrollPeriod));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.create(feedbackEntity.payrollPeriod));
    },
  });
}

export function useUpdatePayrollPeriodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePayrollPeriodPayload }) => updatePayrollPeriod(id, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods.lists() });
      notifyMutationSuccess(feedbackCopy.success.updated(feedbackEntity.payrollPeriod));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.update(feedbackEntity.payrollPeriod));
    },
  });
}
