import { createKeyFactory } from '@/lib/query-keys';

export const learningCourseKeys = createKeyFactory<void>('learning-courses');
export const learningSessionKeys = createKeyFactory<void>('learning-sessions');
export const learningCertKeys = createKeyFactory<void>('learning-certifications');
export const learningPathKeys = createKeyFactory<void>('learning-paths');
