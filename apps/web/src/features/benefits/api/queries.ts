import { queryOptions } from '@tanstack/react-query';
import { queryPolicyPresets } from '@/lib/query-client';
import {
  listBenefitPlans,
  getBenefitPlan,
  listBenefitEnrollments,
} from './benefits';
import {
  benefitPlanKeys,
  benefitEnrollmentKeys,
  type BenefitPlanListFilters,
  type BenefitEnrollmentListFilters,
} from '../queries/benefit-queries';

export const benefitPlansQueryOptions = (filters?: BenefitPlanListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: benefitPlanKeys.list(filters),
    queryFn: () => listBenefitPlans(filters as Record<string, unknown>),
  });

export const benefitPlanDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: benefitPlanKeys.detail(id),
    queryFn: () => getBenefitPlan(id),
    enabled: !!id,
  });

export const benefitEnrollmentsQueryOptions = (filters?: BenefitEnrollmentListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: benefitEnrollmentKeys.list(filters),
    queryFn: () => listBenefitEnrollments(filters as Record<string, unknown>),
  });
