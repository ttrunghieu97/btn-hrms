import type { SalaryStructure, CreateSalaryStructurePayload } from '../types';

export function toSalaryStructure(dto: Record<string, unknown>): SalaryStructure {
  return {
    id: dto.id as string,
    employeeId: dto.employeeId as string,
    currency: dto.currency as string,
    payFrequency: dto.payFrequency as string,
    baseSalary: dto.baseSalary as string,
    components: (dto.components as Record<string, unknown>) ?? null,
    effectiveFrom: dto.effectiveFrom as string,
    effectiveTo: (dto.effectiveTo as string) ?? null,
    isCurrent: dto.isCurrent as boolean,
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
    employee: dto.employee as SalaryStructure['employee'],
  };
}

export function toCreatePayload(formValues: {
  employeeId: string;
  payFrequency: string;
  baseSalary: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string;
  isCurrent: boolean;
}): CreateSalaryStructurePayload {
  return {
    employeeId: formValues.employeeId,
    payFrequency: formValues.payFrequency,
    baseSalary: formValues.baseSalary,
    currency: formValues.currency,
    effectiveFrom: formValues.effectiveFrom,
    effectiveTo: formValues.effectiveTo || undefined,
    isCurrent: formValues.isCurrent,
  };
}
