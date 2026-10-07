import { createKeyFactory } from '@/lib/query-keys';

export type RequisitionListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
};

export type PostingListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  requisitionId?: string;
  status?: 'open' | 'paused' | 'closed';
};

export type CandidateListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  postingId?: string;
};

export const requisitionKeys = createKeyFactory<RequisitionListFilters>('recruitment-requisitions');
export const postingKeys = createKeyFactory<PostingListFilters>('recruitment-postings');
export const applicationKeys = createKeyFactory<CandidateListFilters>('recruitment-applications');

export const offerKeys = {
  all: () => ['recruitment-offers'] as const,
  byApplication: (applicationId: string) =>
    ['recruitment-offers', 'application', applicationId] as const,
  detail: (id: string) => ['recruitment-offers', 'detail', id] as const,
};
