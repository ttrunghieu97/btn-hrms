import { type PayslipResponseDto } from "../dto/payslip-response.dto";

type PayslipResponseRow = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  currency: string;
  status: string;
  publishedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { name: string | null } | null;
  } | null;
  payrollRun?: {
    id: string;
    status: string;
    payrollPeriodId: string;
  } | null;
};

export class PayslipMapper {
  static toResponseDto(row: PayslipResponseRow): PayslipResponseDto {
    return {
      id: row.id,
      payrollRunId: row.payrollRunId,
      employeeId: row.employeeId,
      grossPay: String(row.grossPay),
      totalDeductions: String(row.totalDeductions),
      netPay: String(row.netPay),
      currency: row.currency,
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employee: row.employee
        ? {
            id: row.employee.id,
            employeeCode: row.employee.employeeCode,
            fullName:
              `${row.employee.firstName} ${row.employee.lastName}`.trim(),
            departmentName: row.employee.department?.name ?? null,
          }
        : undefined,
      payrollRun: row.payrollRun
        ? {
            id: row.payrollRun.id,
            status: row.payrollRun.status,
            payrollPeriodId: row.payrollRun.payrollPeriodId,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: PayslipResponseRow[]): PayslipResponseDto[] {
    return rows.map((row) => this.toResponseDto(row));
  }

  static toEntity(dto: Record<string, unknown>): Record<string, unknown> {
    return { ...dto };
  }
}

