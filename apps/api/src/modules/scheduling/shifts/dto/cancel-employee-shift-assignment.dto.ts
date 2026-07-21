import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, IsInt, Min } from "class-validator";

export class CancelEmployeeShiftAssignmentDto {
  @ApiProperty({ description: "YYYY-MM-DD" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  cancelFrom!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

