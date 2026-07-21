import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PayrollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  salary!: string;

  @ApiPropertyOptional()
  bonus?: string;

  @ApiPropertyOptional()
  deduction?: string;

  @ApiPropertyOptional()
  allowance?: string;

  @ApiPropertyOptional()
  overtimeAmount?: string;

  @ApiPropertyOptional()
  taxAmount?: string;

  @ApiPropertyOptional()
  insuranceAmount?: string;

  @ApiPropertyOptional()
  netSalary?: string;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional()
  effectiveFrom?: string | null;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeCode: string;
    avatar?: string | null;
    position?: string | null;
    departmentName?: string | null;
  };

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}



