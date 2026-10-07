import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OnboardingTemplateItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty()
  assigneeType!: string;

  @ApiPropertyOptional()
  assigneeUserId?: string | null;

  @ApiProperty()
  dueDaysOffset!: number;

  @ApiProperty()
  isMandatory!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OnboardingTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  departmentId?: string | null;

  @ApiPropertyOptional()
  positionId?: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [OnboardingTemplateItemResponseDto] })
  items!: OnboardingTemplateItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
