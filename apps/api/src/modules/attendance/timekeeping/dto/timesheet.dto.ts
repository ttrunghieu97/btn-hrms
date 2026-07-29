import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
} from "class-validator";

/**
 * Single timesheet record in a batch request.
 */
export class BatchTimesheetRecordDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: "YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate!: string;

  @ApiProperty({ description: "HH:mm" })
  @Matches(/^\d{2}:\d{2}$/)
  checkIn!: string;

  @ApiProperty({ description: "HH:mm" })
  @Matches(/^\d{2}:\d{2}$/)
  checkOut!: string;
}

/**
 * Batch timesheet save request.
 */
export class BatchTimesheetDto {
  @ApiProperty({ description: "Period in YYYY-MM format" })
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  period!: string;

  @ApiProperty({ type: [BatchTimesheetRecordDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchTimesheetRecordDto)
  records!: BatchTimesheetRecordDto[];
}

// ─── Lock / Unlock DTOs ───────────────────────────────────────────────

export class LockPeriodDto {
  @ApiProperty({ description: "Period in YYYY-MM format" })
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  period!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UnlockPeriodDto {
  @ApiProperty({ description: "Period in YYYY-MM format" })
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  period!: string;

  @ApiProperty()
  @IsString()
  remarks!: string; // required for unlock — audit trail
}

// ─── Response DTOs ────────────────────────────────────────────────────

export class BatchErrorDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty({ description: "YYYY-MM-DD" })
  workDate!: string;

  @ApiProperty()
  reason!: string;
}

export class BatchTimesheetResponseDto {
  @ApiProperty()
  success!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [BatchErrorDto] })
  errors!: BatchErrorDto[];
}

export class PeriodLockResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  lockedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  lockedAt!: Date | null;

  @ApiProperty({ nullable: true })
  unlockedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  unlockedAt!: Date | null;

  @ApiProperty({ nullable: true })
  remarks!: string | null;
}
