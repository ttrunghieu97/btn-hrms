import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const VALID_STATUSES = [
  "working",
  "probation",
  "terminated",
  "leave",
  "suspended",
  "retired",
] as const;

export class ChangeEmployeeStatusDto {
  @ApiProperty({
    description: "Target employee status",
    enum: VALID_STATUSES,
  })
  @IsString()
  @IsIn(VALID_STATUSES)
  status!: string;

  @ApiPropertyOptional({
    description: "Effective date (YYYY-MM-DD). Defaults to today.",
  })
  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Reason for the status change",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
