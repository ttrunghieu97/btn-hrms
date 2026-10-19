import type { Payslip } from '../types';

export function toPayslip(dto: Record<string, unknown>): Payslip {
  const metadata = (dto.metadata as Record<string, unknown>) ?? null;
  const calculationStatus =
    dto.calculationStatus === 'CONFIRMED' ||
    dto.calculationStatus === 'PROVISIONAL_POLICY_UNCONFIRMED'
      ? dto.calculationStatus
      : metadata?.calculationStatus === 'CONFIRMED'
        ? 'CONFIRMED'
        : 'PROVISIONAL_POLICY_UNCONFIRMED';
  const isProvisional =
    typeof dto.isProvisional === 'boolean'
      ? dto.isProvisional
      : calculationStatus !== 'CONFIRMED' || metadata?.isProvisional === true;

  return {
    id: dto.id as string,
    payrollRunId: dto.payrollRunId as string,
    employeeId: dto.employeeId as string,
    grossPay: dto.grossPay as string,
    totalDeductions: dto.totalDeductions as string,
    netPay: dto.netPay as string,
    currency: dto.currency as string,
    status: dto.status as Payslip['status'],
    isProvisional,
    calculationStatus,
    publishedAt: (dto.publishedAt as string) ?? null,
    metadata,
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
    employee: dto.employee as Payslip['employee'],
    payrollRun: dto.payrollRun as Payslip['payrollRun'],
  };
}
