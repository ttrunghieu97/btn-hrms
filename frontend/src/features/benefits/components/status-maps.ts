import type { StatusMap } from '@/components/ui/status-badge';
import { benefitsUiCopy } from '@/locales/vi/app-copy';

export const BENEFIT_PLAN_STATUS_MAP: StatusMap = {
  draft: { label: benefitsUiCopy.planStatus.draft, variant: 'outline' },
  published: { label: benefitsUiCopy.planStatus.published, variant: 'default' },
  closed: { label: benefitsUiCopy.planStatus.closed, variant: 'secondary' },
};

export const ENROLLMENT_STATUS_MAP: StatusMap = {
  pending: { label: benefitsUiCopy.enrollmentStatus.pending, variant: 'outline' },
  approved: { label: benefitsUiCopy.enrollmentStatus.approved, variant: 'secondary' },
  active: { label: benefitsUiCopy.enrollmentStatus.active, variant: 'default' },
  cancelled: { label: benefitsUiCopy.enrollmentStatus.cancelled, variant: 'outline' },
  terminated: { label: benefitsUiCopy.enrollmentStatus.terminated, variant: 'destructive' },
};

export interface BenefitPlanRow {
  id: string;
  name?: string;
  status?: string;
  coverageType?: string;
  providerName?: string | null;
  employerContribution?: string | null;
  employeeContribution?: string | null;
  createdAt?: string;
}

export interface BenefitEnrollmentRow {
  id: string;
  planId?: string;
  planName?: string;
  employeeId?: string;
  employeeName?: string;
  status?: string;
  coverageType?: string;
  effectiveFrom?: string | null;
  enrolledAt?: string;
}

export interface BenefitProviderRow {
  id: string;
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}
