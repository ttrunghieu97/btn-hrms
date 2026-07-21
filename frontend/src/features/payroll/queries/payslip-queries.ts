import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPayslips, getPayslip, publishPayslip } from '../api/payslips';
import { payrollKeys } from './payroll-keys';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { feedbackCopy } from '@/lib/feedback-copy';
import type { Payslip, PayslipListParams, PublishPayslipPayload } from '../types';
import type { PayslipListResponse } from '../api/payslips';

export const payslipsQueryOptions = (params?: PayslipListParams) =>
  queryOptions({
    queryKey: payrollKeys.payslips.list(params as Record<string, unknown>),
    queryFn: (): Promise<PayslipListResponse> => listPayslips(params),
  });

export function usePayslipsQuery(params?: PayslipListParams) {
  return useQuery(payslipsQueryOptions(params));
}

export function usePayslipQuery(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.payslips.detail(id!),
    queryFn: (): Promise<Payslip> => getPayslip(id!),
    enabled: !!id,
  });
}

export function usePublishPayslipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: PublishPayslipPayload }) => publishPayslip(id, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips.lists() });
      notifyMutationSuccess('Đã công bố phiếu lương');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể công bố phiếu lương');
    },
  });
}
