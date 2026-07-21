import { createKeyFactory } from '@/lib/query-keys';

export type OnboardingProcessFilters = {
  page?: number;
  limit?: number;
};

export const onboardingTemplateKeys = createKeyFactory<void>('onboarding-templates');
export const onboardingProcessKeys = createKeyFactory<OnboardingProcessFilters>('onboarding-processes');
