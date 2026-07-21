import { createKeyFactory } from '@/lib/query-keys';

export type PerformanceCycleListFilters = {
  page?: number;
  limit?: number;
  status?: string;
};

export type PerformanceGoalListFilters = {
  page?: number;
  limit?: number;
  status?: string;
};

export type PerformanceReviewListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  cycleId?: string;
};

export const performanceCycleKeys = createKeyFactory<PerformanceCycleListFilters>('performance-cycles');
export const performanceGoalKeys = createKeyFactory<PerformanceGoalListFilters>('performance-goals');
export const performanceReviewKeys = createKeyFactory<PerformanceReviewListFilters>('performance-reviews');
