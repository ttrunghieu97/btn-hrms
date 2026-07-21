import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPerformanceCycle, transitionCycle,
  createPerformanceGoal, transitionGoal,
  assignReviewer,
  type CreateCyclePayload,
  type CreateGoalPayload,
  type AssignReviewerPayload,
} from './performance';
import { performanceCycleKeys, performanceGoalKeys, performanceReviewKeys } from '../queries/performance-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { performanceUiCopy } from '@/locales/vi/app-copy';

// ─── Cycles ───

export function useCreatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCyclePayload) => createPerformanceCycle(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceCycleKeys.all() });
      notifyMutationSuccess(performanceUiCopy.feedback.created);
    },
    onError: (error) => notifyMutationError(error, performanceUiCopy.feedback.createFailed),
  });
}

export function useTransitionCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => transitionCycle(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceCycleKeys.all() });
      notifyMutationSuccess(performanceUiCopy.feedback.transitioned);
    },
    onError: (error) => notifyMutationError(error, performanceUiCopy.feedback.transitionFailed),
  });
}

// ─── Goals ───

export function useCreatePerformanceGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, dto }: { cycleId: string; dto: CreateGoalPayload }) => createPerformanceGoal(cycleId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceGoalKeys.all() });
      notifyMutationSuccess(performanceUiCopy.feedback.goalCreated);
    },
    onError: (error) => notifyMutationError(error, performanceUiCopy.feedback.goalCreateFailed),
  });
}

export function useTransitionGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, action }: { goalId: string; action: string }) => transitionGoal(goalId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceGoalKeys.all() });
      notifyMutationSuccess(performanceUiCopy.feedback.goalTransitioned);
    },
    onError: (error) => notifyMutationError(error, performanceUiCopy.feedback.goalTransitionFailed),
  });
}

// ─── Reviews ───

export function useAssignReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AssignReviewerPayload) => assignReviewer(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceReviewKeys.all() });
      notifyMutationSuccess(performanceUiCopy.feedback.reviewerAssigned);
    },
    onError: (error) => notifyMutationError(error, performanceUiCopy.feedback.reviewerAssignFailed),
  });
}
