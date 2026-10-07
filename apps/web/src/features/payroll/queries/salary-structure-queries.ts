import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSalaryStructures, getSalaryStructure, createSalaryStructure } from '../api/salary-structures';
import { payrollKeys } from './payroll-keys';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { SalaryStructureListParams, CreateSalaryStructurePayload, SalaryStructure } from '../types';
import type { SalaryStructureListResponse } from '../api/salary-structures';

export const salaryStructuresQueryOptions = (params?: SalaryStructureListParams) =>
  queryOptions({
    queryKey: payrollKeys.salaryStructures.list(params as Record<string, unknown>),
    queryFn: (): Promise<SalaryStructureListResponse> => listSalaryStructures(params),
  });

export function useSalaryStructuresQuery(params?: SalaryStructureListParams) {
  return useQuery(salaryStructuresQueryOptions(params));
}

export function useSalaryStructureQuery(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.salaryStructures.detail(id!),
    queryFn: (): Promise<SalaryStructure> => getSalaryStructure(id!),
    enabled: !!id,
  });
}

export function useCreateSalaryStructureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalaryStructurePayload) => createSalaryStructure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.salaryStructures.lists() });
      notifyMutationSuccess(feedbackCopy.success.created('cấu trúc lương'));
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.create('cấu trúc lương'));
    },
  });
}
