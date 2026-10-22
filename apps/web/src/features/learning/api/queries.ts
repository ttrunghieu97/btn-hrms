import { queryOptions } from '@tanstack/react-query';
import { queryPolicyPresets } from '@/lib/query-client';
import {
  listCourses,
  getCourse,
  listMyEnrollments,
  listSessions,
  listCertDefinitions,
  listEmployeeCertificates,
  listLearningPaths,
  getLearningPath,
} from './learning';
import { learningCourseKeys, learningSessionKeys, learningCertKeys, learningPathKeys } from '../queries/learning-queries';

export const coursesQueryOptions = () => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningCourseKeys.list(), queryFn: () => listCourses() });
export const courseDetailQueryOptions = (id: string) => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningCourseKeys.detail(id), queryFn: () => getCourse(id), enabled: !!id });
export const myEnrollmentsQueryOptions = () => queryOptions({ ...queryPolicyPresets['employees'], queryKey: [...learningCourseKeys.all(), 'my-enrollments'] as const, queryFn: () => listMyEnrollments() });
export const sessionsQueryOptions = (courseId: string) => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningSessionKeys.list(), queryFn: () => listSessions(courseId), enabled: !!courseId });
export const certDefsQueryOptions = () => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningCertKeys.list(), queryFn: () => listCertDefinitions() });
export const employeeCertificatesQueryOptions = (employeeId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: [...learningCertKeys.all(), 'employee', employeeId] as const,
    queryFn: () => listEmployeeCertificates(employeeId),
    enabled: !!employeeId,
  });
export const learningPathsQueryOptions = () => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningPathKeys.list(), queryFn: () => listLearningPaths() });
export const learningPathDetailQueryOptions = (id: string) => queryOptions({ ...queryPolicyPresets['employees'], queryKey: learningPathKeys.detail(id), queryFn: () => getLearningPath(id), enabled: !!id });
