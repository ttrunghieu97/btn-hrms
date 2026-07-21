import { type CreatePayrollPeriodDto } from "../dto/create-payroll-period.dto";
import { type UpdatePayrollPeriodDto } from "../dto/update-payroll-period.dto";
import { type PayrollPeriodResponseDto } from "../dto/payroll-period-response.dto";

type PayrollPeriodResponseRow = {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  payDate?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PayrollPeriodMapper {
  static toResponseDto(row: PayrollPeriodResponseRow): PayrollPeriodResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      payDate: row.payDate ?? null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseDtos(rows: PayrollPeriodResponseRow[]): PayrollPeriodResponseDto[] {
    return rows.map((row) => this.toResponseDto(row));
  }

  static toEntity(dto: CreatePayrollPeriodDto | UpdatePayrollPeriodDto): Record<string, unknown> {
    if (!dto) return {};

    const entity: Record<string, unknown> = {};
    if (dto.code !== undefined) entity.code = dto.code;
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.startsOn !== undefined) entity.startsOn = dto.startsOn;
    if (dto.endsOn !== undefined) entity.endsOn = dto.endsOn;
    if (dto.payDate !== undefined) entity.payDate = dto.payDate;
    if (dto.status !== undefined) entity.status = dto.status;
    return entity;
  }
}

