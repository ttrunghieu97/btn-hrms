import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PayslipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  payrollRunId!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  grossPay!: string;

  @ApiProperty()
  totalDeductions!: string;

  @ApiProperty()
  netPay!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>   | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    departmentName?: string | null;
  };

  @ApiPropertyOptional()
  payrollRun?: {
    id: string;
    status: string;
    payrollPeriodId: string;
  };
}



