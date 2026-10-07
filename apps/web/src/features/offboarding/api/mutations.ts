import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { fetchOffboardingList, fetchOffboardingDetail, completeChecklistItem, decideClearance, scheduleExitInterview, recordExitInterview, completeProcess } from './offboarding-client';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';

export function useCompleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, taskId, skip }: { processId: string; taskId: string; skip?: boolean }) =>
      completeChecklistItem(processId, taskId, skip),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['offboarding', 'detail', variables.processId] });
      qc.invalidateQueries({ queryKey: ['offboarding', 'list'] });
      notifyMutationSuccess('Cập nhật checklist thành công');
    },
    onError: (e: unknown) => notifyMutationError(e, 'Cập nhật checklist thất bại'),
  });
}

export function useDecideClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, department, decision, note }: { processId: string; department: string; decision: string; note?: string }) =>
      decideClearance(processId, department, decision, note),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['offboarding', 'detail', variables.processId] });
      qc.invalidateQueries({ queryKey: ['offboarding', 'list'] });
      notifyMutationSuccess('Cập nhật clearance thành công');
    },
    onError: (e: unknown) => notifyMutationError(e, 'Cập nhật clearance thất bại'),
  });
}

export function useScheduleExitInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, employeeId, interviewerUserId, scheduledAt }: { processId: string; employeeId: string; interviewerUserId: string; scheduledAt: string }) =>
      scheduleExitInterview(processId, { employeeId, interviewerUserId, scheduledAt }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['offboarding', 'detail', variables.processId] });
      notifyMutationSuccess('Lên lịch phỏng vấn thành công');
    },
    onError: (e: unknown) => notifyMutationError(e, 'Lên lịch phỏng vấn thất bại'),
  });
}

export function useRecordExitInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, responses, notes }: { processId: string; responses?: Record<string, unknown>; notes?: string }) =>
      recordExitInterview(processId, { responses, notes }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['offboarding', 'detail', variables.processId] });
      notifyMutationSuccess('Ghi nhận phỏng vấn thành công');
    },
    onError: (e: unknown) => notifyMutationError(e, 'Ghi nhận phỏng vấn thất bại'),
  });
}

export function useCompleteOffboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (processId: string) => completeProcess(processId),
    onSuccess: (_data, processId) => {
      qc.invalidateQueries({ queryKey: ['offboarding', 'detail', processId] });
      qc.invalidateQueries({ queryKey: ['offboarding', 'list'] });
      notifyMutationSuccess('Hoàn tất quy trình offboarding');
    },
    onError: (e: unknown) => notifyMutationError(e, 'Hoàn tất offboarding thất bại'),
  });
}
