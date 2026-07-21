import { queryOptions } from '@tanstack/react-query';
import {
  requisitionsControllerList,
  requisitionsControllerGet,
  postingsControllerList,
  postingsControllerGet,
  candidatesControllerList,
  candidatesControllerGet,
  offersControllerList,
  offersControllerGet,
} from '@/api/generated/endpoints';
import { queryPolicyPresets } from '@/lib/query-client';
import {
  requisitionKeys,
  postingKeys,
  applicationKeys,
  offerKeys,
  type RequisitionListFilters,
  type PostingListFilters,
  type CandidateListFilters,
} from '../queries/recruitment-queries';

export const requisitionsQueryOptions = (filters?: RequisitionListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: requisitionKeys.list(filters),
    queryFn: () => requisitionsControllerList(filters),
  });

export const requisitionDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: requisitionKeys.detail(id),
    queryFn: () => requisitionsControllerGet(id),
    enabled: !!id,
  });

export const postingsQueryOptions = (filters?: PostingListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: postingKeys.list(filters),
    queryFn: () => postingsControllerList(filters),
  });

export const postingDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: postingKeys.detail(id),
    queryFn: () => postingsControllerGet(id),
    enabled: !!id,
  });

export const applicationsQueryOptions = (filters?: CandidateListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: applicationKeys.list(filters),
    queryFn: () => candidatesControllerList(filters),
  });

export const applicationDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: applicationKeys.detail(id),
    queryFn: () => candidatesControllerGet(id),
    enabled: !!id,
  });

export const applicationOffersQueryOptions = (applicationId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: offerKeys.byApplication(applicationId),
    queryFn: () => offersControllerList({ applicationId }),
    enabled: !!applicationId,
  });

export const offerDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: offerKeys.detail(id),
    queryFn: () => offersControllerGet(id),
    enabled: !!id,
  });
