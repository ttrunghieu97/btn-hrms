import { envClient } from '@/lib/env.client';

const BASE = `${envClient.apiBaseUrl}/api/v1/offboarding`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface OffboardingProcessListItem {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
}

export interface OffboardingProcessDetail {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  checklistItems: unknown[];
  clearances: unknown[];
}

export async function fetchOffboardingList(page = 1, limit = 20) {
  return request<{ rows: OffboardingProcessListItem[]; total: number }>(`?page=${page}&limit=${limit}`);
}

export async function fetchOffboardingDetail(id: string) {
  return request<OffboardingProcessDetail>(`/${id}`);
}

export async function completeChecklistItem(
  processId: string,
  taskId: string,
  skip = false,
) {
  return request(`/${processId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ skip }),
  });
}

export async function decideClearance(
  processId: string,
  department: string,
  decision: string,
  note?: string,
) {
  return request(`/${processId}/clearances/${department}`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

export async function scheduleExitInterview(
  processId: string,
  data: { employeeId: string; interviewerUserId: string; scheduledAt: string },
) {
  return request(`/${processId}/exit-interview`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function recordExitInterview(
  processId: string,
  data: { responses?: Record<string, unknown>; notes?: string },
) {
  return request(`/${processId}/exit-interview`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function completeProcess(processId: string) {
  return request(`/${processId}/complete`, { method: 'POST' });
}
