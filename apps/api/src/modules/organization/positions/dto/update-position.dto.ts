import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, IsEnum } from "class-validator";
import { JobCategory } from "./create-position.dto";

export class UpdatePositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ enum: JobCategory })
  @IsOptional()
  @IsEnum(JobCategory)
  jobCategory?: JobCategory;
}
