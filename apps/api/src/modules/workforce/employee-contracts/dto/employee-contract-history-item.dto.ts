import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployeeContractHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  version: number;

  @ApiPropertyOptional()
  previousContractId?: string | null;

  @ApiProperty()
  contractType: string;

  @ApiProperty()
  contractStatus: string;

  @ApiProperty()
  effectiveFrom: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  signedAt?: string | null;

  @ApiPropertyOptional()
  contractNumber?: string | null;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
