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

export interface SalaryLookup {
  baseSalary?: number;
  label?: string;
}

/**
 * Best-effort current base salary for an employee.
 * Returns null when nothing is configured or the lookup fails — callers must
 * not block the page on salary data (it is informational only).
 */
export async function getCurrentBaseSalary(employeeId: string): Promise<SalaryLookup | null> {
  try {
    const { rows } = await listSalaryStructures({ employeeId, limit: 1 });
    const current = rows.find((r) => r.isCurrent) ?? rows[0];
    if (!current) return null;
    const amount = Number(current.baseSalary);
    if (!Number.isFinite(amount) || amount <= 0) return { label: current.baseSalary };
    const fmt = new Intl.NumberFormat('vi-VN');
    return { baseSalary: amount, label: `${fmt.format(amount)}₫` };
  } catch {
    return null;
  }
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
