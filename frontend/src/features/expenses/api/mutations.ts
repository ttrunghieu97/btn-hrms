import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createExpenseClaim,
  submitExpenseClaim,
  approveExpenseClaim,
  rejectExpenseClaim,
  reimburseExpenseClaim,
  addExpenseClaimItem,
  type CreateClaimPayload,
  type AddItemPayload,
} from './expenses';
import { expenseClaimKeys } from '../queries/expense-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { expensesUiCopy } from '@/locales/vi/app-copy';

export function useCreateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateClaimPayload) => createExpenseClaim(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      notifyMutationSuccess(expensesUiCopy.feedback.created);
    },
    onError: (error) => notifyMutationError(error, expensesUiCopy.feedback.createFailed),
  });
}

export function useSubmitExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => submitExpenseClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      notifyMutationSuccess(expensesUiCopy.feedback.submitted);
    },
    onError: (error) => notifyMutationError(error, expensesUiCopy.feedback.submitFailed),
  });
}

export function useApproveExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => approveExpenseClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      notifyMutationSuccess(expensesUiCopy.feedback.approved);
    },
    onError: (error) => notifyMutationError(error, expensesUiCopy.feedback.approveFailed),
  });
}

export function useRejectExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectExpenseClaim(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      notifyMutationSuccess(expensesUiCopy.feedback.rejected);
    },
    onError: (error) => notifyMutationError(error, expensesUiCopy.feedback.rejectFailed),
  });
}

export function useReimburseExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => reimburseExpenseClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      notifyMutationSuccess(expensesUiCopy.feedback.reimbursed);
    },
    onError: (error) => notifyMutationError(error, expensesUiCopy.feedback.reimburseFailed),
  });
}
