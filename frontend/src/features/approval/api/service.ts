import { envClient } from '@/lib/env.client';
import { extractList, extractPagination, unwrapData, type PaginationMeta } from '@/lib/api-extract';

const BASE = `${envClient.apiBaseUrl}/api/v1`;

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

export interface ApprovalPolicy {
  id: string;
  key: string;
  version: number;
  name: string | null;
  description: string | null;
  steps: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  id: string;
  requestId: string;
  stepIndex: number;
  status: string;
  approverUserId: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  comment: string | null;
  payload: unknown;
  createdAt: string;
  request?: ApprovalRequest;
}

export interface ApprovalRequest {
  id: string;
  policyId: string;
  subjectType: string;
  subjectId: string;
  status: string;
  currentStepIndex: number;
  requestedByUserId: string | null;
  decidedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  steps?: ApprovalStep[];
  policy?: { id: string; key: string; name?: string | null };
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// Approval Policies
export async function fetchApprovalPolicies(params?: { page?: number; limit?: number; key?: string; isActive?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.key) searchParams.set('key', params.key);
  if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  return request<PaginatedResult<ApprovalPolicy>>(`/approval-policies${qs ? `?${qs}` : ''}`);
}

export async function fetchApprovalPolicy(id: string) {
  return request<ApprovalPolicy>(`/approval-policies/${id}`);
}

export async function createApprovalPolicy(data: { key: string; name?: string; description?: string; steps: Record<string, unknown> }) {
  return request<ApprovalPolicy>('/approval-policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateApprovalPolicy(id: string, data: { name?: string; description?: string; steps?: Record<string, unknown> }) {
  return request<ApprovalPolicy>(`/approval-policies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deactivateApprovalPolicy(id: string) {
  return request<ApprovalPolicy>(`/approval-policies/${id}`, { method: 'DELETE' });
}

// Approval Requests
export async function fetchApprovalRequests(params?: { page?: number; limit?: number; status?: string; policyId?: string; subjectType?: string; subjectId?: string; requestedByUserId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.policyId) searchParams.set('policyId', params.policyId);
  if (params?.subjectType) searchParams.set('subjectType', params.subjectType);
  if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
  if (params?.requestedByUserId) searchParams.set('requestedByUserId', params.requestedByUserId);
  const qs = searchParams.toString();
  return request<PaginatedResult<ApprovalRequest>>(`/approval-requests${qs ? `?${qs}` : ''}`);
}

export async function fetchApprovalRequest(id: string) {
  return request<ApprovalRequest>(`/approval-requests/${id}`);
}

export async function requestApproval(data: { policyId: string; subjectType: string; subjectId: string; metadata?: Record<string, unknown> }) {
  return request<ApprovalRequest>('/approval-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function decideApprovalStep(requestId: string, data: { stepIndex: number; decision: 'approve' | 'reject'; comment?: string }) {
  return request(`/approval-requests/${requestId}/decide`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelApprovalRequest(requestId: string) {
  return request(`/approval-requests/${requestId}/cancel`, { method: 'POST' });
}

export async function fetchApprovalInbox(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return request<PaginatedResult<ApprovalStep>>(`/approval-requests/inbox${qs ? `?${qs}` : ''}`);
}
