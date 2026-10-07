import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/expenses';

// ─── Claims ───

export interface CreateClaimPayload {
  title: string;
  description?: string;
  currency?: string;
}

export interface AddItemPayload {
  claimId: string;
  categoryId?: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptRequired?: boolean;
}

export async function listExpenseClaims(params?: Record<string, unknown>) {
  const search = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  return customFetch(`${BASE}/claims${search}`);
}

export async function getExpenseClaim(id: string) {
  return customFetch(`${BASE}/claims/${id}`);
}

export async function createExpenseClaim(dto: CreateClaimPayload) {
  return customFetch(BASE + '/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function submitExpenseClaim(id: string) {
  return customFetch(`${BASE}/claims/${id}/submit`, { method: 'POST' });
}

export async function approveExpenseClaim(id: string) {
  return customFetch(`${BASE}/claims/${id}/approve`, { method: 'POST' });
}

export async function rejectExpenseClaim(id: string, reason?: string) {
  return customFetch(`${BASE}/claims/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function reimburseExpenseClaim(id: string) {
  return customFetch(`${BASE}/claims/${id}/reimburse`, { method: 'POST' });
}

export async function addExpenseClaimItem(dto: AddItemPayload) {
  return customFetch(BASE + '/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}
