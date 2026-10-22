import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCourse,
  publishCourse,
  enrollCourse,
  completeCourseEnrollment,
  assignCourseToEmployees,
  createSession,
  publishSession,
  cancelSession,
  registerSession,
  withdrawSession,
  checkInSession,
  completeSession,
  createCertDefinition,
  issueEmployeeCertificate,
  renewEmployeeCertificate,
  revokeEmployeeCertificate,
  createLearningPath,
  publishLearningPath,
  assignLearningPath,
  completeLearningPath,
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
export function useCompleteCourseEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => completeCourseEnrollment(enrollmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningCourseKeys.all() });
      notifyMutationSuccess('Đã hoàn thành khóa học');
    },
    onError: (e) => notifyMutationError(e, 'Không thể hoàn thành khóa học'),
  });
}
export function useAssignCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { courseId: string; employeeIds: string[]; dueDate?: string }) =>
      assignCourseToEmployees(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningCourseKeys.all() });
      notifyMutationSuccess('Đã giao khóa học cho nhân viên');
    },
    onError: (e) => notifyMutationError(e, 'Không thể giao khóa học'),
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
export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { definitionId: string; employeeId: string; courseId?: string }) =>
      issueEmployeeCertificate(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningCertKeys.all() });
      notifyMutationSuccess('Đã cấp chứng chỉ cho nhân viên');
    },
    onError: (e) => notifyMutationError(e, 'Không thể cấp chứng chỉ'),
  });
}
export function useRenewCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => renewEmployeeCertificate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningCertKeys.all() });
      notifyMutationSuccess('Đã gia hạn chứng chỉ');
    },
    onError: (e) => notifyMutationError(e, 'Không thể gia hạn chứng chỉ'),
  });
}
export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeEmployeeCertificate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningCertKeys.all() });
      notifyMutationSuccess('Đã thu hồi chứng chỉ');
    },
    onError: (e) => notifyMutationError(e, 'Không thể thu hồi chứng chỉ'),
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
export function useAssignLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { pathId: string; employeeIds: string[] }) =>
      assignLearningPath(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningPathKeys.all() });
      notifyMutationSuccess('Đã gán lộ trình học tập');
    },
    onError: (e) => notifyMutationError(e, 'Không thể gán lộ trình học tập'),
  });
}
export function useCompleteLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeLearningPath(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: learningPathKeys.all() });
      notifyMutationSuccess('Đã hoàn thành lộ trình học tập');
    },
    onError: (e) => notifyMutationError(e, 'Không thể hoàn thành lộ trình học tập'),
  });
}
