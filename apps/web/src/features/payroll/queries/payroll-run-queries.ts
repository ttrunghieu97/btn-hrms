import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  updatePayrollRun,
  generatePayrollRun,
  requestApprovalPayrollRun,
  approvePayrollRun,
  rejectPayrollRun,
  postPayrollRun,
} from '../api/payroll-runs';
import { payrollKeys } from './payroll-keys';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type {
  PayrollRun,
  PayrollRunListParams,
  CreatePayrollRunPayload,
  UpdatePayrollRunPayload,
} from '../types';
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
    mutationFn: ({ id, data }: { id: string; data: UpdatePayrollRunPayload }) =>
      updatePayrollRun(id, data),
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
      notifyMutationSuccess('Tính toán và tạo phiếu lương thành công');
    },
    onError: (error) => {
      notifyMutationError(error, 'Tính toán phiếu lương thất bại');
    },
  });
}

export function useRequestApprovalPayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestApprovalPayrollRun(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess('Đã gửi trình duyệt bảng lương');
    },
    onError: (error) => {
      notifyMutationError(error, 'Gửi trình duyệt bảng lương thất bại');
    },
  });
}

export function useApprovePayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvePayrollRun(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess('Phê duyệt bảng lương thành công');
    },
    onError: (error) => {
      notifyMutationError(error, 'Phê duyệt bảng lương thất bại');
    },
  });
}

export function useRejectPayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectPayrollRun(id, reason),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess('Đã từ chối bảng lương (trả về bản nháp)');
    },
    onError: (error) => {
      notifyMutationError(error, 'Từ chối bảng lương thất bại');
    },
  });
}

export function usePostPayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postPayrollRun(id),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs.lists() });
      notifyMutationSuccess('Chốt và xuất bảng lương thành công');
    },
    onError: (error) => {
      notifyMutationError(error, 'Chốt bảng lương thất bại');
    },
  });
}
