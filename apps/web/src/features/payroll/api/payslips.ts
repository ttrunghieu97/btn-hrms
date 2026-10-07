import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { toPayslip } from './payslip-mapper';
import type { Payslip, PayslipListParams, PublishPayslipPayload } from '../types';

export interface PayslipListResponse {
  rows: Payslip[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayslips(params?: PayslipListParams): Promise<PayslipListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params?.payrollRunId) searchParams.set('payrollRunId', params.payrollRunId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch(`/api/v1/payroll/payslips${qs ? '?' + qs : ''}`);
  const body = (res as { data: { data: unknown[]; meta: { page: number; limit: number; total: number } } }).data;
  return {
    rows: (body.data ?? []).map((r) => toPayslip(r as Record<string, unknown>)),
    page: body.meta?.page ?? 1,
    limit: body.meta?.limit ?? 20,
    total: body.meta?.total ?? 0,
  };
}

export async function getPayslip(id: string): Promise<Payslip> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/payslips/${id}`
  );
  return toPayslip(unwrapData(res) as Record<string, unknown>);
}

export async function publishPayslip(id: string, payload?: PublishPayslipPayload): Promise<Payslip> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/payslips/${id}/publish`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload ?? {}),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toPayslip(unwrapData(res) as Record<string, unknown>);
}
