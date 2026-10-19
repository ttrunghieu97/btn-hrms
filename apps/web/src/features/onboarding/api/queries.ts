import { queryOptions } from '@tanstack/react-query';
import { queryPolicyPresets } from '@/lib/query-client';
import { listOnboardingTemplates, getOnboardingTemplate } from './onboarding';
import { listOnboardingProcesses, getOnboardingProcess } from './processes';
import { onboardingTemplateKeys, onboardingProcessKeys } from '../queries/onboarding-queries';

export const onboardingTemplatesQueryOptions = () =>
  queryOptions({ ...queryPolicyPresets['employees'], queryKey: onboardingTemplateKeys.list(), queryFn: () => listOnboardingTemplates() });

export const onboardingTemplateDetailQueryOptions = (id: string) =>
  queryOptions({ ...queryPolicyPresets['employees'], queryKey: onboardingTemplateKeys.detail(id), queryFn: () => getOnboardingTemplate(id), enabled: !!id });

export const onboardingProcessesQueryOptions = (
  page = 1,
  limit = 20,
  status?: string | null,
  employeeId?: string | null,
) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: onboardingProcessKeys.list({ page, limit, status, employeeId }),
    queryFn: () => listOnboardingProcesses(page, limit, status, employeeId),
  });

export const onboardingProcessDetailQueryOptions = (id: string) =>
  queryOptions({ ...queryPolicyPresets['employees'], queryKey: onboardingProcessKeys.detail(id), queryFn: () => getOnboardingProcess(id), enabled: !!id });
