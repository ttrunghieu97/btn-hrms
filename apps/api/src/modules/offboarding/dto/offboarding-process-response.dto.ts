import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OffboardingClearanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  department!: string;

  @ApiProperty()
  decision!: string;

  @ApiPropertyOptional()
  decidedByUserId?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  decidedAt?: string | null;
}

export class OffboardingChecklistItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  mandatory!: boolean;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiProperty()
  isCompleted!: boolean;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiPropertyOptional()
  completedByUserID?: string | null;
}

export class OffboardingSettlementDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  payrollRef?: string | null;

  @ApiProperty()
  isOutstanding!: boolean;
}

export class OffboardingProcessDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiPropertyOptional()
  templateId?: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional()
  targetEndDate?: string | null;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiProperty({ type: [OffboardingChecklistItemDto] })
  checklistItems!: OffboardingChecklistItemDto[];

  @ApiProperty({ type: [OffboardingClearanceResponseDto] })
  clearances!: OffboardingClearanceResponseDto[];

  @ApiPropertyOptional()
  exitInterview?: {
    id: string;
    scheduledAt: string | null;
    conductedAt: string | null;
  } | null;

  @ApiPropertyOptional()
  settlement?: OffboardingSettlementDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OffboardingProcessListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiProperty()
  createdAt!: Date;
}
