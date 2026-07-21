import { queryOptions } from '@tanstack/react-query';
import { queryPolicyPresets } from '@/lib/query-client';
import {
  listPerformanceCycles, getPerformanceCycle,
  listPerformanceGoals,
  listPerformanceReviews,
} from './performance';
import {
  performanceCycleKeys,
  performanceGoalKeys,
  performanceReviewKeys,
  type PerformanceCycleListFilters,
  type PerformanceReviewListFilters,
} from '../queries/performance-queries';

export const performanceCyclesQueryOptions = (filters?: PerformanceCycleListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: performanceCycleKeys.list(filters),
    queryFn: () => listPerformanceCycles(),
  });

export const performanceCycleDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: performanceCycleKeys.detail(id),
    queryFn: () => getPerformanceCycle(id),
    enabled: !!id,
  });

export const performanceGoalsQueryOptions = (cycleId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: performanceGoalKeys.list({}),
    queryFn: () => listPerformanceGoals(cycleId),
    enabled: !!cycleId,
  });

export const performanceReviewsQueryOptions = (cycleId: string, filters?: PerformanceReviewListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: performanceReviewKeys.list({ ...filters, cycleId }),
    queryFn: () => listPerformanceReviews(cycleId),
    enabled: !!cycleId,
  });
