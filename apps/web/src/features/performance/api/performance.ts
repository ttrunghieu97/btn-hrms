import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/performance';

// ─── Cycles ───

export interface CreateCyclePayload {
  name: string;
  startsOn: string;
  endsOn: string;
  config?: Record<string, unknown>;
}

export async function listPerformanceCycles() {
  return customFetch(`${BASE}/cycles`);
}

export async function getPerformanceCycle(id: string) {
  return customFetch(`${BASE}/cycles/${id}`);
}

export async function createPerformanceCycle(dto: CreateCyclePayload) {
  return customFetch(BASE + '/cycles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function transitionCycle(id: string, action: string) {
  return customFetch(`${BASE}/cycles/${id}/${action}`, { method: 'POST' });
}

// ─── Goals ───

export interface CreateGoalPayload {
  title: string;
  description?: string;
  employeeIds?: string[];
}

export async function listPerformanceGoals(cycleId: string) {
  return customFetch(`${BASE}/cycles/${cycleId}/goals`);
}

export async function createPerformanceGoal(cycleId: string, dto: CreateGoalPayload) {
  return customFetch(`${BASE}/cycles/${cycleId}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function transitionGoal(goalId: string, action: string) {
  return customFetch(`${BASE}/goals/${goalId}/${action}`, { method: 'POST' });
}

// ─── Reviews ───

export async function listPerformanceReviews(cycleId: string) {
  return customFetch(`${BASE}/cycles/${cycleId}/reviews/summary`);
}

export interface AssignReviewerPayload {
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  reviewType: 'self' | 'manager' | 'peer' | 'subordinate' | 'committee';
  dueDate?: string;
}

export async function assignReviewer(dto: AssignReviewerPayload) {
  return customFetch(BASE + '/review-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}
