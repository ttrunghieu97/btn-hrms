import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const APPLICATION_STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export class AdvanceStageDto {
  @ApiProperty({ enum: APPLICATION_STAGES })
  @IsIn(APPLICATION_STAGES)
  toStage!: (typeof APPLICATION_STAGES)[number];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string;
}
