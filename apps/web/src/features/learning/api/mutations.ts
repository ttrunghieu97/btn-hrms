import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCourse,
  publishCourse,
  enrollCourse,
  createSession,
  publishSession,
  cancelSession,
  registerSession,
  withdrawSession,
  checkInSession,
  completeSession,
  createCertDefinition,
  createLearningPath,
  publishLearningPath,
} from './learning';
import { learningCourseKeys, learningSessionKeys, learningCertKeys, learningPathKeys } from '../queries/learning-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { learningUiCopy } from '@/locales/vi/app-copy';

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; description?: string; estimatedHours?: number }) => createCourse(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningCourseKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.courseCreated); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.courseCreateFailed),
  });
}
export function usePublishCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => publishCourse(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningCourseKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.coursePublished); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.coursePublishFailed),
  });
}
export function useEnrollCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => enrollCourse(courseId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningCourseKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.enrolled); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.enrollFailed),
  });
}
export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { courseId: string; title: string; scheduledAt: string; durationMinutes?: number; location?: string; meetingUrl?: string; maxAttendees?: number }) => createSession(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.sessionCreated); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.sessionCreateFailed),
  });
}
export function usePublishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => publishSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.sessionPublished); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.sessionPublishFailed),
  });
}
export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => cancelSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.sessionCancelled); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.sessionCancelFailed),
  });
}
export function useRegisterSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => registerSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess('Đã đăng ký tham gia buổi học'); },
    onError: (e) => notifyMutationError(e, 'Không thể đăng ký buổi học'),
  });
}
export function useWithdrawSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => withdrawSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess('Đã hủy đăng ký buổi học'); },
    onError: (e) => notifyMutationError(e, 'Không thể hủy đăng ký buổi học'),
  });
}
export function useCheckInSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => checkInSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess('Đã điểm danh tham gia buổi học'); },
    onError: (e) => notifyMutationError(e, 'Không thể điểm danh buổi học'),
  });
}
export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => completeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningSessionKeys.all() }); notifyMutationSuccess('Đã xác nhận hoàn thành buổi học'); },
    onError: (e) => notifyMutationError(e, 'Không thể hoàn thành buổi học'),
  });
}
export function useCreateCertDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; issuer?: string; validityMonths?: number }) => createCertDefinition(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningCertKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.certDefCreated); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.certDefCreateFailed),
  });
}
export function useCreateLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; courses?: string[] }) => createLearningPath(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningPathKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.pathCreated); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.pathCreateFailed),
  });
}
export function usePublishLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => publishLearningPath(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: learningPathKeys.all() }); notifyMutationSuccess(learningUiCopy.feedback.pathPublished); },
    onError: (e) => notifyMutationError(e, learningUiCopy.feedback.pathPublishFailed),
  });
}
