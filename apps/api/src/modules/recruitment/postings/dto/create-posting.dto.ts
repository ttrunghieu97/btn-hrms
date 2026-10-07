import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from "class-validator";

export class CreatePostingDto {
  @ApiProperty()
  @IsUUID()
  requisitionId!: string;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: "Date string, e.g. 2026-01-31" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openedAt?: string;

  @ApiPropertyOptional({ description: "Date string, e.g. 2026-01-31" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  closesAt?: string;
}
