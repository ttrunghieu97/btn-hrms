import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested,
} from "class-validator";
import { PagedQueryDto } from "../../../shared/dto/pagination.dto";

const TEMPLATE_TYPES = ["onboarding", "offboarding"] as const;
const ASSIGNEE_TYPES = ["employee", "manager", "hr", "it", "specific"] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Item DTO                                                            */
/* ------------------------------------------------------------------ */

export class OnboardingTemplateItemDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: ASSIGNEE_TYPES })
  @IsString()
  @IsIn(ASSIGNEE_TYPES)
  assigneeType!: AssigneeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  assigneeUserId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  dueDaysOffset?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMandatory?: boolean;
}

/* ------------------------------------------------------------------ */
/* Query DTO                                                           */
/* ------------------------------------------------------------------ */

export class ListOnboardingTemplatesQueryDto extends PagedQueryDto {
  @ApiPropertyOptional({ description: "Free-text search (name, category)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_TYPES)
  type?: TemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ example: "createdAt:desc" })
  @IsOptional()
  @IsString()
  sort?: string;
}

/* ------------------------------------------------------------------ */
/* Create DTO                                                          */
/* ------------------------------------------------------------------ */

export class CreateOnboardingTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: TEMPLATE_TYPES })
  @IsString()
  @IsIn(TEMPLATE_TYPES)
  type!: TemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  positionId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ type: [OnboardingTemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: "Template must have at least 1 checklist item" })
  @Type(() => OnboardingTemplateItemDto)
  items!: OnboardingTemplateItemDto[];
}

/* ------------------------------------------------------------------ */
/* Update DTO                                                          */
/* ------------------------------------------------------------------ */

export class UpdateOnboardingTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(TEMPLATE_TYPES)
  type?: TemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  positionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ type: [OnboardingTemplateItemDto], description: "Omit to keep existing items, send [] to clear all" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTemplateItemDto)
  items?: OnboardingTemplateItemDto[];
}
