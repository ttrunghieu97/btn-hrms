import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, Matches } from "class-validator";

export class TerminateEmployeeDto {
  @ApiProperty({
    description: "Reason for termination",
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({
    description: "Effective date of termination (YYYY-MM-DD)",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "effectiveDate must be in YYYY-MM-DD format",
  })
  effectiveDate!: string;

  @ApiProperty({
    description: "Last working date (YYYY-MM-DD). Must be <= effectiveDate",
    required: false,
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "lastWorkingDate must be in YYYY-MM-DD format",
  })
  lastWorkingDate?: string;
}
