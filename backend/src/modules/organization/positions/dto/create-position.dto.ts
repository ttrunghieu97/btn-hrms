import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from "class-validator";

export enum JobCategory {
  MANAGER = "manager",
  HIGH_LEVEL_TECHNICAL = "high_level_technical",
  MID_LEVEL_TECHNICAL = "mid_level_technical",
  OTHER = "other",
}

export class CreatePositionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ enum: JobCategory, default: JobCategory.OTHER })
  @IsOptional()
  @IsEnum(JobCategory)
  jobCategory?: JobCategory;
}
