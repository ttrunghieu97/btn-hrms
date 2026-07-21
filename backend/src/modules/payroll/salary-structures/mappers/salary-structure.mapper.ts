import { type UpsertSalaryStructureDto } from "../dto/upsert-salary-structure.dto";

type SalaryStructureResponseRow = {
  id: string;
  employeeId: string;
  currency: string;
  payFrequency: string;
  baseSalary: string;
  components: unknown;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
};

type SalaryStructureEntityInput = {
  employeeId?: string;
  currency?: string;
  payFrequency?: string;
  baseSalary?: string;
  components?: unknown;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isCurrent?: boolean;
};

export class SalaryStructureMapper {
  static toDto(row: SalaryStructureResponseRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      currency: row.currency,
      payFrequency: row.payFrequency,
      baseSalary: String(row.baseSalary),
      components: row.components ?? null,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
      isCurrent: row.isCurrent,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employee: row.employee
        ? {
            id: row.employee.id,
            employeeCode: row.employee.employeeCode,
            fullName:
              `${row.employee.firstName} ${row.employee.lastName}`.trim(),
          }
        : undefined,
    };
  }

  static toEntity(dto: UpsertSalaryStructureDto | SalaryStructureEntityInput): Record<string, unknown> {
    const entity: Record<string, unknown> = {};
    if (dto.employeeId !== undefined) entity.employeeId = dto.employeeId;
    if (dto.currency !== undefined) entity.currency = dto.currency;
    if (dto.payFrequency !== undefined) entity.payFrequency = dto.payFrequency;
    if (dto.baseSalary !== undefined) entity.baseSalary = dto.baseSalary;
    if (dto.components !== undefined) entity.components = dto.components;
    if (dto.effectiveFrom !== undefined) entity.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveTo !== undefined) entity.effectiveTo = dto.effectiveTo;
    if (dto.isCurrent !== undefined) entity.isCurrent = dto.isCurrent;
    return entity;
  }
}

