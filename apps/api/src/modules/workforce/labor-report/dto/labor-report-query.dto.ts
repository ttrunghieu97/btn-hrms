import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class LaborReportQueryDto {
  @ApiPropertyOptional({ default: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ enum: ["H1", "H2", "Q1", "Q2", "Q3", "Q4"] })
  @IsOptional()
  period?: "H1" | "H2" | "Q1" | "Q2" | "Q3" | "Q4";
}
