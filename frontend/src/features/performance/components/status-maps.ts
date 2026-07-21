import type { StatusMap } from '@/components/ui/status-badge';
import { performanceUiCopy } from '@/locales/vi/app-copy';

export const CYCLE_STATUS_MAP: StatusMap = {
  draft: { label: performanceUiCopy.cycleStatus.draft, variant: 'outline' },
  planning: { label: performanceUiCopy.cycleStatus.planning, variant: 'secondary' },
  self_review: { label: performanceUiCopy.cycleStatus.self_review, variant: 'default' },
  manager_review: { label: performanceUiCopy.cycleStatus.manager_review, variant: 'default' },
  calibration: { label: performanceUiCopy.cycleStatus.calibration, variant: 'secondary' },
  ready_for_approval: { label: performanceUiCopy.cycleStatus.ready_for_approval, variant: 'secondary' },
  approved: { label: performanceUiCopy.cycleStatus.approved, variant: 'default' },
  published: { label: performanceUiCopy.cycleStatus.published, variant: 'default' },
  closed: { label: performanceUiCopy.cycleStatus.closed, variant: 'outline' },
};

export const GOAL_STATUS_MAP: StatusMap = {
  draft: { label: performanceUiCopy.goalStatus.draft, variant: 'outline' },
  submitted: { label: performanceUiCopy.goalStatus.submitted, variant: 'secondary' },
  approved: { label: performanceUiCopy.goalStatus.approved, variant: 'default' },
  completed: { label: performanceUiCopy.goalStatus.completed, variant: 'default' },
  cancelled: { label: performanceUiCopy.goalStatus.cancelled, variant: 'destructive' },
};

export const REVIEW_STATUS_MAP: StatusMap = {
  pending: { label: performanceUiCopy.reviewStatus.pending, variant: 'outline' },
  in_progress: { label: performanceUiCopy.reviewStatus.in_progress, variant: 'secondary' },
  submitted: { label: performanceUiCopy.reviewStatus.submitted, variant: 'default' },
};

export interface PerformanceCycleRow {
  id: string;
  name?: string;
  status?: string;
  startsOn?: string;
  endsOn?: string;
  createdAt?: string;
}

export interface PerformanceGoalRow {
  id: string;
  title?: string;
  status?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface PerformanceReviewRow {
  id: string;
  employeeId?: string;
  employeeName?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewType?: string;
  status?: string;
  dueDate?: string | null;
}
