import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, Min } from "class-validator";

const TIME_OR_ISO_REGEX =
  /^(?:|(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?|\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:[0-5]\d)?)$/;

export class OverrideAttendanceSummaryDto {
  @ApiProperty({ description: "Target employee UUID" })
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ description: "Target work date YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsNotEmpty()
  workDate!: string;

  @ApiProperty({ enum: ["manual_correction", "policy_exception", "data_fix", "reconciliation"] })
  @IsString()
  @IsNotEmpty()
  @IsIn(["manual_correction", "policy_exception", "data_fix", "reconciliation"])
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: ["present", "late", "early_leave", "absent", "leave", "holiday", "off"] })
  @IsOptional()
  @IsString()
  @IsIn(["present", "late", "early_leave", "absent", "leave", "holiday", "off"])
  overriddenStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  overriddenWorkedMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  overriddenLateMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  overriddenEarlyLeaveMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  overriddenOvertimeMinutes?: number;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  @Matches(TIME_OR_ISO_REGEX, { message: "checkInMorning must be a valid HH:mm (00:00-23:59) or ISO timestamp" })
  checkInMorning?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  @Matches(TIME_OR_ISO_REGEX, { message: "checkOutMorning must be a valid HH:mm (00:00-23:59) or ISO timestamp" })
  checkOutMorning?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  @Matches(TIME_OR_ISO_REGEX, { message: "checkInAfternoon must be a valid HH:mm (00:00-23:59) or ISO timestamp" })
  checkInAfternoon?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  @Matches(TIME_OR_ISO_REGEX, { message: "checkOutAfternoon must be a valid HH:mm (00:00-23:59) or ISO timestamp" })
  checkOutAfternoon?: string | null;

  @ApiPropertyOptional({ description: "Lunch break in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  breakMinutes?: number | null;

  @ApiPropertyOptional({ description: "Personal break in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  personalBreakMinutes?: number | null;

  @ApiPropertyOptional({ description: "Lunch duty in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  lunchDutyMinutes?: number | null;

  @ApiPropertyOptional({ description: "Duty 30K in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  duty30kMinutes?: number | null;

  @ApiPropertyOptional({ description: "Night shift duty count (0..10)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  nightShiftDutyCount?: number | null;

  @ApiPropertyOptional({ description: "Water booth duty count (0..10)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  waterBoothDutyCount?: number | null;
}
