import type { Payslip } from '../types';

export function toPayslip(dto: Record<string, unknown>): Payslip {
  return {
    id: dto.id as string,
    payrollRunId: dto.payrollRunId as string,
    employeeId: dto.employeeId as string,
    grossPay: dto.grossPay as string,
    totalDeductions: dto.totalDeductions as string,
    netPay: dto.netPay as string,
    currency: dto.currency as string,
    status: dto.status as Payslip['status'],
    publishedAt: (dto.publishedAt as string) ?? null,
    metadata: (dto.metadata as Record<string, unknown>) ?? null,
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
    employee: dto.employee as Payslip['employee'],
    payrollRun: dto.payrollRun as Payslip['payrollRun'],
  };
}
