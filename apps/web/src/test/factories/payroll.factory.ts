/**
 * Payroll test data factory.
 */
import type { PayrollPeriodSummaryDto } from '@/api/generated/model';

type Overrides = Partial<PayrollPeriodSummaryDto>;

let counter = 0;

export function createPayrollPeriodFactory(
  overrides: Overrides = {},
): PayrollPeriodSummaryDto {
  counter += 1;
  return {
    id: `period-${counter}`,
    code: `P2026-${String(counter).padStart(2, '0')}`,
    name: `Payroll Period ${counter}`,
    ...overrides,
  };
}

export interface PayrollRunResult {
  id: string;
  periodId: string;
  status: 'draft' | 'processing' | 'approved' | 'posted';
  totalEmployees: number;
  totalAmount: number;
  processedAt: string | null;
  createdAt: string;
}

let runCounter = 0;

export function createPayrollRunFactory(
  overrides: Partial<PayrollRunResult> = {},
): PayrollRunResult {
  runCounter += 1;
  return {
    id: `run-${runCounter}`,
    periodId: `period-${runCounter}`,
    status: 'draft',
    totalEmployees: 10,
    totalAmount: 50000000,
    processedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
