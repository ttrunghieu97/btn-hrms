import type { StatusMap } from '@/components/ui/status-badge';
import { recruitmentUiCopy } from '@/lib/app-copy';

export const REQUISITION_STATUS_MAP: StatusMap = {
  draft: { label: recruitmentUiCopy.requisitionStatus.draft, variant: 'outline' },
  pending_approval: {
    label: recruitmentUiCopy.requisitionStatus.pending_approval,
    variant: 'secondary',
  },
  approved: { label: recruitmentUiCopy.requisitionStatus.approved, variant: 'default' },
  rejected: { label: recruitmentUiCopy.requisitionStatus.rejected, variant: 'destructive' },
  closed: { label: recruitmentUiCopy.requisitionStatus.closed, variant: 'outline' },
};

export const POSTING_STATUS_MAP: StatusMap = {
  open: { label: recruitmentUiCopy.postingStatus.open, variant: 'default' },
  paused: { label: recruitmentUiCopy.postingStatus.paused, variant: 'secondary' },
  closed: { label: recruitmentUiCopy.postingStatus.closed, variant: 'outline' },
};

export const STAGE_MAP: StatusMap = {
  applied: { label: recruitmentUiCopy.stages.applied, variant: 'outline' },
  screening: { label: recruitmentUiCopy.stages.screening, variant: 'secondary' },
  interview: { label: recruitmentUiCopy.stages.interview, variant: 'secondary' },
  offer: { label: recruitmentUiCopy.stages.offer, variant: 'default' },
  hired: { label: recruitmentUiCopy.stages.hired, variant: 'default' },
  rejected: { label: recruitmentUiCopy.stages.rejected, variant: 'destructive' },
  withdrawn: { label: recruitmentUiCopy.stages.withdrawn, variant: 'outline' },
};

export const OFFER_STATUS_MAP: StatusMap = {
  draft: { label: recruitmentUiCopy.offerStatus.draft, variant: 'outline' },
  pending_approval: {
    label: recruitmentUiCopy.offerStatus.pending_approval,
    variant: 'secondary',
  },
  approved: { label: recruitmentUiCopy.offerStatus.approved, variant: 'default' },
  accepted: { label: recruitmentUiCopy.offerStatus.accepted, variant: 'default' },
  declined: { label: recruitmentUiCopy.offerStatus.declined, variant: 'destructive' },
  rejected: { label: recruitmentUiCopy.offerStatus.rejected, variant: 'destructive' },
  withdrawn: { label: recruitmentUiCopy.offerStatus.withdrawn, variant: 'outline' },
};

/** Row shapes returned by the recruitment API (mirrors backend mappers). */
export interface RequisitionRow {
  id: string;
  departmentId?: string;
  positionId?: string | null;
  title?: string;
  headcount?: number;
  budgetMin?: string | null;
  budgetMax?: string | null;
  justification?: string | null;
  status?: string;
  createdAt?: string;
}

export interface PostingRow {
  id: string;
  requisitionId?: string;
  title?: string;
  description?: string | null;
  requirements?: string | null;
  status?: string;
  openedAt?: string | null;
  closesAt?: string | null;
  createdAt?: string;
}

export interface CandidateSummary {
  id: string;
  email?: string;
  fullName?: string;
  phone?: string | null;
}

export interface StageEventRow {
  id: string;
  fromStage?: string | null;
  toStage?: string;
  actorUserId?: string | null;
  note?: string | null;
  createdAt?: string;
}

export interface ScorecardRow {
  id: string;
  interviewerUserId?: string;
  rating?: number;
  feedback?: string | null;
  createdAt?: string;
}

export interface ApplicationRow {
  id: string;
  candidateId?: string;
  postingId?: string;
  currentStage?: string;
  cvFileId?: string | null;
  createdAt?: string;
  candidate?: CandidateSummary;
  stageEvents?: StageEventRow[];
  scorecards?: ScorecardRow[];
}

export interface OfferRow {
  id: string;
  applicationId?: string;
  compensation?: string;
  startDate?: string;
  expiresAt?: string | null;
  status?: string;
  decidedAt?: string | null;
  createdAt?: string;
}
