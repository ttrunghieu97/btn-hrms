import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { toSalaryStructure } from './salary-structure-mapper';
import type { SalaryStructure, SalaryStructureListParams, CreateSalaryStructurePayload } from '../types';

export interface SalaryStructureListResponse {
  rows: SalaryStructure[];
  page: number;
  limit: number;
  total: number;
}

export async function listSalaryStructures(params?: SalaryStructureListParams): Promise<SalaryStructureListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch(`/api/v1/payroll/salary-structures${qs ? '?' + qs : ''}`);
  const body = (res as { data: { data: unknown[]; meta: { page: number; limit: number; total: number } } }).data;
  return {
    rows: (body.data ?? []).map((r) => toSalaryStructure(r as Record<string, unknown>)),
    page: body.meta?.page ?? 1,
    limit: body.meta?.limit ?? 20,
    total: body.meta?.total ?? 0,
  };
}

export async function getSalaryStructure(id: string): Promise<SalaryStructure> {
  const res = await customFetch<{ data: unknown }>(
    `/api/v1/payroll/salary-structures/${id}`
  );
  return toSalaryStructure(unwrapData(res) as Record<string, unknown>);
}

export async function createSalaryStructure(payload: CreateSalaryStructurePayload): Promise<SalaryStructure> {
  const res = await customFetch<{ data: unknown }>(
    '/api/v1/payroll/salary-structures',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return toSalaryStructure(unwrapData(res) as Record<string, unknown>);
}
