import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ContractResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  employeeName!: string;

  @ApiPropertyOptional()
  employeeCode?: string | null;

  @ApiPropertyOptional()
  departmentName?: string | null;

  @ApiPropertyOptional()
  contractNumber?: string | null;

  @ApiProperty()
  contractType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional()
  signedAt?: string | null;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  fileUrl?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ContractHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional()
  previousContractId?: string | null;

  @ApiProperty()
  contractType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional()
  signedAt?: string | null;

  @ApiPropertyOptional()
  contractNumber?: string | null;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
