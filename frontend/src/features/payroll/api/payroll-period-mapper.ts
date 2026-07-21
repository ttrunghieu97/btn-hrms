import type { PayrollPeriod } from '../types';

export function toPayrollPeriod(dto: Record<string, unknown>): PayrollPeriod {
  return {
    id: dto.id as string,
    code: dto.code as string,
    name: dto.name as string,
    startsOn: dto.startsOn as string,
    endsOn: dto.endsOn as string,
    payDate: (dto.payDate as string) ?? null,
    status: dto.status as PayrollPeriod['status'],
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
  };
}
