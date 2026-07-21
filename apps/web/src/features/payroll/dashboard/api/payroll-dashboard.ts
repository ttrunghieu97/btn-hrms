import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import type { PayrollDashboardData } from '../types';

export async function getPayrollDashboard(): Promise<PayrollDashboardData> {
  const res = await customFetch<{ data: Record<string, unknown> }>('/api/v1/payroll/dashboard');
  return unwrapData(res) as unknown as PayrollDashboardData;
}
