import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { toPayrollRun } from './payroll-run-mapper';
import type { PayrollRun, PayrollRunListParams, CreatePayrollRunPayload, UpdatePayrollRunPayload } from '../types';

export interface PayrollRunListResponse {
  rows: PayrollRun[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayrollRuns(params?: PayrollRunListParams): Promise<PayrollRunListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.payrollPeriodId) searchParams.set('payrollPeriodId', params.payrollPeriodId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch(`/api/v1/payroll/runs${qs ? '?' + qs : ''}`);
  const body = (res as { data: { data: unknown[]; meta: { page: number; limit: number; total: number } } }).data;
  return {
    rows: (body.data ?? []).map((r) => toPayrollRun(r as Record<string, unknown>)),
    page: body.meta?.page ?? 1,
    limit: body.meta?.limit ?? 20,
    total: body.meta?.total ?? 0,
  };
}

export async function getPayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/runs/${id}`
  );
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function createPayrollRun(payload: CreatePayrollRunPayload): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(
    '/api/v1/payroll/runs',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function updatePayrollRun(id: string, payload: UpdatePayrollRunPayload): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/runs/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function generatePayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/runs/${id}/generate`,
    { method: 'POST' }
  );
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}
