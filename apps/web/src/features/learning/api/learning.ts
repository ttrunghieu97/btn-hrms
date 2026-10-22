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
export async function listMyEnrollments() { return customFetch(`${BASE}/enrollments`); }
export async function completeCourseEnrollment(id: string) { return customFetch(`${BASE}/enrollments/${id}/complete`, { method: 'POST' }); }
export async function assignCourseToEmployees(dto: { courseId: string; employeeIds: string[]; dueDate?: string }) {
  return customFetch(`${BASE}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}

// ─── Sessions ───
export async function listSessions(courseId: string) { return customFetch(`${BASE}/courses/${courseId}/sessions`); }
export async function createSession(dto: { courseId: string; title: string; scheduledAt: string; durationMinutes?: number; location?: string; meetingUrl?: string; maxAttendees?: number }) {
  return customFetch(BASE + '/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function publishSession(id: string) { return customFetch(`${BASE}/sessions/${id}/publish`, { method: 'POST' }); }
export async function cancelSession(id: string) { return customFetch(`${BASE}/sessions/${id}/cancel`, { method: 'POST' }); }
export async function registerSession(id: string) { return customFetch(`${BASE}/sessions/${id}/register`, { method: 'POST' }); }
export async function withdrawSession(id: string) { return customFetch(`${BASE}/sessions/${id}/withdraw`, { method: 'POST' }); }
export async function checkInSession(id: string) { return customFetch(`${BASE}/sessions/${id}/checkin`, { method: 'POST' }); }
export async function completeSession(id: string) { return customFetch(`${BASE}/sessions/${id}/complete`, { method: 'POST' }); }

// ─── Certifications ───
export async function listCertDefinitions() { return customFetch(`${BASE}/certifications/definitions`); }
export async function createCertDefinition(dto: { name: string; description?: string; issuer?: string; validityMonths?: number }) {
  return customFetch(BASE + '/certifications/definitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function issueEmployeeCertificate(dto: { definitionId: string; employeeId: string; courseId?: string }) {
  return customFetch(`${BASE}/certifications/issue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function listEmployeeCertificates(employeeId: string) {
  return customFetch(`${BASE}/certifications/employee/${employeeId}`);
}
export async function renewEmployeeCertificate(id: string) {
  return customFetch(`${BASE}/certifications/${id}/renew`, { method: 'POST' });
}
export async function revokeEmployeeCertificate(id: string) {
  return customFetch(`${BASE}/certifications/${id}/revoke`, { method: 'POST' });
}

// ─── Learning Paths ───
export async function listLearningPaths() { return customFetch(`${BASE}/paths`); }
export async function getLearningPath(id: string) { return customFetch(`${BASE}/paths/${id}`); }
export async function createLearningPath(dto: { name: string; description?: string; courses?: string[] }) {
  return customFetch(BASE + '/paths', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function publishLearningPath(id: string) { return customFetch(`${BASE}/paths/${id}/publish`, { method: 'POST' }); }
export async function assignLearningPath(dto: { pathId: string; employeeIds: string[] }) {
  return customFetch(`${BASE}/paths/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}
export async function completeLearningPath(id: string) {
  return customFetch(`${BASE}/paths/${id}/complete`, { method: 'POST' });
}
