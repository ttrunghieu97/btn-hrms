import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPayrollRuns, getPayrollRun, createPayrollRun, updatePayrollRun, generatePayrollRun } from '../api/payroll-runs';
import { payrollKeys } from './payroll-keys';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { PayrollRun, PayrollRunListParams, CreatePayrollRunPayload, UpdatePayrollRunPayload } from '../types';
import type { PayrollRunListResponse } from '../api/payroll-runs';

export const payrollRunsQueryOptions = (params?: PayrollRunListParams) =>
  queryOptions({
    queryKey: payrollKeys.runs.list(params as Record<string, unknown>),
    queryFn: (): Promise<PayrollRunListResponse> => listPayrollRuns(params),
  });

export function usePayrollRunsQuery(params?: PayrollRunListParams) {
  return useQuery(payrollRunsQueryOptions(params));
}

export function usePayrollRunQuery(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.runs.detail(id!),
    queryFn: (): Promise<PayrollRun> => getPayrollRun(id!),
    enabled: !!id,
  });
}

export function useCreatePayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayrollRunPayload) => createPayrollRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess(feedbackCopy.success.created(feedbackEntity.payrollRun));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.create(feedbackEntity.payrollRun));
    },
  });
}

export function useUpdatePayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePayrollRunPayload }) => updatePayrollRun(id, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess(feedbackCopy.success.updated(feedbackEntity.payrollRun));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.update(feedbackEntity.payrollRun));
    },
  });
}

export function useGeneratePayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => generatePayrollRun(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess(feedbackCopy.success.created(feedbackEntity.payrollTable));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.create(feedbackEntity.payrollTable));
    },
  });
}
