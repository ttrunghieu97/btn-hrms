import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOnboardingTemplate, updateOnboardingTemplate, deleteOnboardingTemplate } from './onboarding';
import { onboardingTemplateKeys } from '../queries/onboarding-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { onboardingUiCopy } from '@/locales/vi/app-copy';

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; type?: string; isDefault?: boolean; items?: any[] }) => createOnboardingTemplate(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: onboardingTemplateKeys.all() }); notifyMutationSuccess(onboardingUiCopy.feedback.created); },
    onError: (e) => notifyMutationError(e, onboardingUiCopy.feedback.createFailed),
  });
}
export function useDeleteOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOnboardingTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: onboardingTemplateKeys.all() }); notifyMutationSuccess(onboardingUiCopy.feedback.deleted); },
    onError: (e) => notifyMutationError(e, onboardingUiCopy.feedback.deleteFailed),
  });
}
