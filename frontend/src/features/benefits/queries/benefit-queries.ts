import { createKeyFactory } from '@/lib/query-keys';

export type BenefitPlanListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published' | 'closed';
};

export type BenefitEnrollmentListFilters = {
  page?: number;
  limit?: number;
  employeeId?: string;
  planId?: string;
  status?: string;
};

export const benefitPlanKeys = createKeyFactory<BenefitPlanListFilters>('benefit-plans');
export const benefitEnrollmentKeys = createKeyFactory<BenefitEnrollmentListFilters>('benefit-enrollments');
export const benefitProviderKeys = createKeyFactory<void>('benefit-providers');
