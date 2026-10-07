import { type CreatePayrollDto } from "../dto/create-payroll.dto";
import { type PayrollResponseDto } from "../dto/payroll-response.dto";
import { type UpdatePayrollDto } from "../dto/update-payroll.dto";
import { type UpsertPayrollDto } from "../dto/upsert-payroll.dto";

type PayrollResponseRow = {
  id: string;
  employeeId: string;
  salary: string;
  bonus?: string;
  deduction?: string;
  allowance?: string;
  overtimeAmount?: string;
  taxAmount?: string;
  insuranceAmount?: string;
  netSalary?: string;
  currency: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    avatar?: string | null;
    orgAssignments?: { isCurrent: boolean; jobTitle: string | null }[];
    department?: { name: string | null } | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PayrollMapper {
  static toResponseDto(row: PayrollResponseRow): PayrollResponseDto {
    const emp = row?.employee;
    return {
      id: row.id,
      employeeId: row.employeeId,
      salary: String(row.salary),
      bonus:
        row.bonus !== undefined && row.bonus !== null
          ? String(row.bonus)
          : undefined,
      deduction:
        row.deduction !== undefined && row.deduction !== null
          ? String(row.deduction)
          : undefined,
      allowance:
        row.allowance !== undefined && row.allowance !== null
          ? String(row.allowance)
          : undefined,
      overtimeAmount:
        row.overtimeAmount !== undefined && row.overtimeAmount !== null
          ? String(row.overtimeAmount)
          : undefined,
      taxAmount:
        row.taxAmount !== undefined && row.taxAmount !== null
          ? String(row.taxAmount)
          : undefined,
      insuranceAmount:
        row.insuranceAmount !== undefined && row.insuranceAmount !== null
          ? String(row.insuranceAmount)
          : undefined,
      netSalary:
        row.netSalary !== undefined && row.netSalary !== null
          ? String(row.netSalary)
          : undefined,
      currency: row.currency,
      effectiveFrom: row.effectiveFrom ?? null,
      effectiveTo: row.effectiveTo ?? null,
      employee: emp
        ? {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            fullName: `${emp.firstName} ${emp.lastName}`.trim(),
            employeeCode: emp.employeeCode,
            avatar: emp.avatar ?? null,
            position:
              emp.orgAssignments?.find((assignment) => assignment.isCurrent)?.jobTitle ?? null,
            departmentName: emp.department?.name ?? null,
          }
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseDtos(rows: PayrollResponseRow[]): PayrollResponseDto[] {
    return rows.map((r) => PayrollMapper.toResponseDto(r));
  }

  static toEntity(dto: CreatePayrollDto | UpdatePayrollDto | UpsertPayrollDto): Record<string, unknown> {
    if (!dto) return {};

    const entity: Record<string, unknown> = {};
    if (dto.salary !== undefined) entity.salary = dto.salary;
    if (dto.bonus !== undefined) entity.bonus = dto.bonus;
    if (dto.deduction !== undefined) entity.deduction = dto.deduction;
    if (dto.allowance !== undefined) entity.allowance = dto.allowance;
    if (dto.overtimeAmount !== undefined) entity.overtimeAmount = dto.overtimeAmount;
    if (dto.taxAmount !== undefined) entity.taxAmount = dto.taxAmount;
    if (dto.insuranceAmount !== undefined) entity.insuranceAmount = dto.insuranceAmount;
    if (dto.netSalary !== undefined) entity.netSalary = dto.netSalary;
    if (dto.currency !== undefined) entity.currency = dto.currency;
    if (dto.effectiveFrom !== undefined) entity.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveTo !== undefined) entity.effectiveTo = dto.effectiveTo;
    return entity;
  }
}

