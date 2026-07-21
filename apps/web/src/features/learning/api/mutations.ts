import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCourse, publishCourse, enrollCourse, createSession, publishSession, cancelSession, createCertDefinition, createLearningPath, publishLearningPath } from './learning';
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
