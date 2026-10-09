import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOnboardingTemplate, updateOnboardingTemplate, deleteOnboardingTemplate } from './onboarding';
import { completeOnboardingItem, reopenOnboardingItem, skipOnboardingItem } from './processes';
import { onboardingTemplateKeys, onboardingProcessKeys } from '../queries/onboarding-queries';
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

export function useCompleteOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, itemId, note }: { processId: string; itemId: string; note?: string }) =>
      completeOnboardingItem(processId, itemId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingProcessKeys.all() });
      notifyMutationSuccess('Đã hoàn thành mục checklist!');
    },
    onError: (e) => notifyMutationError(e, 'Không thể cập nhật mục checklist.'),
  });
}

export function useReopenOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, itemId, note }: { processId: string; itemId: string; note?: string }) =>
      reopenOnboardingItem(processId, itemId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingProcessKeys.all() });
      notifyMutationSuccess('Đã mở lại mục checklist.');
    },
    onError: (e) => notifyMutationError(e, 'Không thể mở lại mục checklist.'),
  });
}

export function useSkipOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, itemId, note }: { processId: string; itemId: string; note?: string }) =>
      skipOnboardingItem(processId, itemId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingProcessKeys.all() });
      notifyMutationSuccess('Đã bỏ qua mục checklist.');
    },
    onError: (e) => notifyMutationError(e, 'Không thể bỏ qua mục checklist.'),
  });
}
