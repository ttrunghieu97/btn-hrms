import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBenefitPlan,
  publishBenefitPlan,
  enrollEmployee,
  approveEnrollment,
  cancelEnrollment,
  type CreatePlanPayload,
  type EnrollEmployeePayload,
} from './benefits';
import { benefitPlanKeys, benefitEnrollmentKeys } from '../queries/benefit-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { benefitsUiCopy } from '@/locales/vi/app-copy';

const entity = benefitsUiCopy.entity;

export function useCreateBenefitPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePlanPayload) => createBenefitPlan(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: benefitPlanKeys.all() });
      notifyMutationSuccess(benefitsUiCopy.feedback.created);
    },
    onError: (error) => notifyMutationError(error, benefitsUiCopy.feedback.createFailed),
  });
}

export function usePublishBenefitPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => publishBenefitPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: benefitPlanKeys.all() });
      notifyMutationSuccess(benefitsUiCopy.feedback.published);
    },
    onError: (error) => notifyMutationError(error, benefitsUiCopy.feedback.publishFailed),
  });
}

export function useEnrollEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EnrollEmployeePayload) => enrollEmployee(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: benefitEnrollmentKeys.all() });
      notifyMutationSuccess(benefitsUiCopy.feedback.enrolled);
    },
    onError: (error) => notifyMutationError(error, benefitsUiCopy.feedback.enrollFailed),
  });
}

export function useApproveEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => approveEnrollment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: benefitEnrollmentKeys.all() });
      notifyMutationSuccess(benefitsUiCopy.feedback.approved);
    },
    onError: (error) => notifyMutationError(error, benefitsUiCopy.feedback.approveFailed),
  });
}

export function useCancelEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => cancelEnrollment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: benefitEnrollmentKeys.all() });
      notifyMutationSuccess(benefitsUiCopy.feedback.cancelled);
    },
    onError: (error) => notifyMutationError(error, benefitsUiCopy.feedback.cancelFailed),
  });
}
