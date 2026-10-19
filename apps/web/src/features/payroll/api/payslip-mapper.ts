import type { Payslip } from '../types';

export function toPayslip(dto: Record<string, unknown>): Payslip {
  const metadata = (dto.metadata as Record<string, unknown>) ?? null;
  const rawCalcStatus =
    typeof dto.calculationStatus === 'string'
      ? dto.calculationStatus
      : typeof metadata?.calculationStatus === 'string'
        ? metadata.calculationStatus
        : undefined;
  const calculationStatus =
    rawCalcStatus === 'CONFIRMED' || rawCalcStatus === 'PROVISIONAL_POLICY_UNCONFIRMED'
      ? rawCalcStatus
      : undefined;
  const isProvisional =
    typeof dto.isProvisional === 'boolean'
      ? dto.isProvisional
      : typeof metadata?.isProvisional === 'boolean'
        ? metadata.isProvisional
        : calculationStatus === 'PROVISIONAL_POLICY_UNCONFIRMED';

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
