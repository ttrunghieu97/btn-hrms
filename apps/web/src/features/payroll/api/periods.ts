import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { toPayrollPeriod } from './payroll-period-mapper';
import type { PayrollPeriod, PayrollPeriodListParams, CreatePayrollPeriodPayload, UpdatePayrollPeriodPayload } from '../types';

export interface PayrollPeriodListResponse {
  rows: PayrollPeriod[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayrollPeriods(params?: PayrollPeriodListParams): Promise<PayrollPeriodListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch(`/api/v1/payroll/periods${qs ? '?' + qs : ''}`);
  const body = (res as { data: { data: unknown[]; meta: { page: number; limit: number; total: number } } }).data;
  return {
    rows: (body.data ?? []).map((r) => toPayrollPeriod(r as Record<string, unknown>)),
    page: body.meta?.page ?? 1,
    limit: body.meta?.limit ?? 20,
    total: body.meta?.total ?? 0,
  };
}

export async function getPayrollPeriod(id: string): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/periods/${id}`
  );
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}

export async function createPayrollPeriod(payload: CreatePayrollPeriodPayload): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>(
    '/api/v1/payroll/periods',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}

export async function updatePayrollPeriod(id: string, payload: UpdatePayrollPeriodPayload): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/periods/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}
