import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/learning';

// ─── Courses ───
export async function listCourses() { return customFetch(`${BASE}/courses`); }
export async function getCourse(id: string) { return customFetch(`${BASE}/courses/${id}`); }
export async function createCourse(dto: { title: string; description?: string; estimatedHours?: number }) {
  return customFetch(BASE + '/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function publishCourse(id: string) { return customFetch(`${BASE}/courses/${id}/publish`, { method: 'POST' }); }
export async function enrollCourse(courseId: string) { return customFetch(BASE + '/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }) }); }

// ─── Sessions ───
export async function listSessions(courseId: string) { return customFetch(`${BASE}/courses/${courseId}/sessions`); }
export async function createSession(dto: { courseId: string; title: string; scheduledAt: string; durationMinutes?: number; location?: string; meetingUrl?: string; maxAttendees?: number }) {
  return customFetch(BASE + '/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function publishSession(id: string) { return customFetch(`${BASE}/sessions/${id}/publish`, { method: 'POST' }); }
export async function cancelSession(id: string) { return customFetch(`${BASE}/sessions/${id}/cancel`, { method: 'POST' }); }

// ─── Certifications ───
export async function listCertDefinitions() { return customFetch(`${BASE}/certifications/definitions`); }
export async function createCertDefinition(dto: { name: string; description?: string; issuer?: string; validityMonths?: number }) {
  return customFetch(BASE + '/certifications/definitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}

// ─── Learning Paths ───
export async function listLearningPaths() { return customFetch(`${BASE}/paths`); }
export async function getLearningPath(id: string) { return customFetch(`${BASE}/paths/${id}`); }
export async function createLearningPath(dto: { name: string; description?: string; courses?: string[] }) {
  return customFetch(BASE + '/paths', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function publishLearningPath(id: string) { return customFetch(`${BASE}/paths/${id}/publish`, { method: 'POST' }); }
