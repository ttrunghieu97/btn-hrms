import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/benefits';

// ─── Plans ───

export interface CreatePlanPayload {
  name: string;
  description?: string;
  providerId?: string;
  coverageType: 'employee_only' | 'employee_plus_one' | 'family';
  employerContribution?: number;
  employeeContribution?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  maxEligibleAge?: number;
}

export async function listBenefitPlans(params?: Record<string, unknown>) {
  const search = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  return customFetch(`${BASE}/plans${search}`);
}

export async function getBenefitPlan(id: string) {
  return customFetch(`${BASE}/plans/${id}`);
}

export async function createBenefitPlan(dto: CreatePlanPayload) {
  return customFetch(BASE + '/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function publishBenefitPlan(id: string) {
  return customFetch(`${BASE}/plans/${id}/publish`, { method: 'POST' });
}

// ─── Enrollments ───

export interface EnrollEmployeePayload {
  planId: string;
  employeeId: string;
  coverageType: 'employee_only' | 'employee_plus_one' | 'family';
  effectiveFrom?: string;
}

export async function listBenefitEnrollments(params?: Record<string, unknown>) {
  const search = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  return customFetch(`${BASE}/enrollments${search}`);
}

export async function enrollEmployee(dto: EnrollEmployeePayload) {
  return customFetch(BASE + '/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function approveEnrollment(id: string) {
  return customFetch(`${BASE}/enrollments/${id}/approve`, { method: 'POST' });
}

export async function cancelEnrollment(id: string) {
  return customFetch(`${BASE}/enrollments/${id}/cancel`, { method: 'POST' });
}
