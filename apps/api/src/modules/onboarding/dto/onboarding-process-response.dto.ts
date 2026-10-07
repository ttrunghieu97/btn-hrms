import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OnboardingChecklistItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  dueDaysOffset!: number;

  @ApiProperty()
  mandatory!: boolean;

  @ApiProperty({ nullable: true })
  dueDate!: string | null;

  @ApiProperty()
  isCompleted!: boolean;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ nullable: true })
  completedByUserID!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateOnboardingProcessResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty({ nullable: true })
  templateId!: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty({ nullable: true })
  targetEndDate!: string | null;

  @ApiProperty({ nullable: true })
  assignedHrUserId!: string | null;

  @ApiProperty({ type: [OnboardingChecklistItemResponseDto] })
  checklistItems!: OnboardingChecklistItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
