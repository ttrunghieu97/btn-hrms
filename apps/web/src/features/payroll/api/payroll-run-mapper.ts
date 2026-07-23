import type { PayrollRun } from '../types';

export function toPayrollRun(dto: Record<string, unknown>): PayrollRun {
  return {
    id: dto.id as string,
    payrollPeriodId: dto.payrollPeriodId as string,
    branchId: (dto.branchId as string) ?? null,
    status: dto.status as PayrollRun['status'],
    approvedByUserId: (dto.approvedByUserId as string) ?? null,
    approvedAt: (dto.approvedAt as string) ?? null,
    processedAt: (dto.processedAt as string) ?? null,
    notes: (dto.notes as string) ?? null,
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
    payrollPeriod: dto.payrollPeriod as PayrollRun['payrollPeriod'],
  };
}
