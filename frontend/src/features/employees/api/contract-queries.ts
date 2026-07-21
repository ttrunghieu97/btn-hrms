import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  employeeContractsControllerGet,
  employeeContractsControllerHistory,
  employeeContractsControllerUpdate,
} from '@/api/generated/endpoints';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { unwrapData } from '@/lib/api-extract';
import { toast } from 'sonner';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { UpdateEmployeeContractDto } from '@/api/generated/model';

export const contractKeys = {
  current: (employeeId: string) => ['employee-contract', employeeId] as const,
  history: (employeeId: string) => ['employee-contract-history', employeeId] as const,
};

export interface ContractData {
  employeeId: string;
  startDate: string | null;
  endDate: string | null;
  contractType: string | null;
  contractStatus: string;
}

export interface ContractHistoryItem {
  id: string;
  version: number;
  previousContractId?: string | null;
  contractType: string;
  contractStatus: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  signedAt?: string | null;
  contractNumber?: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function useContractQuery(employeeId: string) {
  return useQuery({
    queryKey: contractKeys.current(employeeId),
    queryFn: async () => {
      const response = await employeeContractsControllerGet(employeeId);
      return unwrapData<ContractData>(response);
    },
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  });
}

export function useContractHistoryQuery(employeeId: string) {
  return useQuery({
    queryKey: contractKeys.history(employeeId),
    queryFn: async () => {
      const response = await employeeContractsControllerHistory(employeeId);
      return unwrapData<ContractHistoryItem[]>(response);
    },
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  });
}

export function useAmendContractMutation(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEmployeeContractDto) => {
      const response = await employeeContractsControllerUpdate(employeeId, data);
      return unwrapData<ContractData>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.current(employeeId) });
      void queryClient.invalidateQueries({ queryKey: contractKeys.history(employeeId) });
      toast.success(feedbackCopy.success.saved(feedbackEntity.employee));
    },
    onError: (error) => {
      toast.error(getVietnameseApiErrorMessage(error, feedbackCopy.failure.save(feedbackEntity.employee)));
    },
  });
}
