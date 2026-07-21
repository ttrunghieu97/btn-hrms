import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployeeContractResponseDto {
  @ApiProperty()
  employeeId: string;

  @ApiPropertyOptional()
  startDate?: string | null;

  @ApiPropertyOptional()
  endDate?: string | null;

  @ApiPropertyOptional()
  contractType?: string | null;

  @ApiProperty()
  contractStatus: string;
}

