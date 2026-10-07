import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator";

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
  overriddenWorkedMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  overriddenLateMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  overriddenEarlyLeaveMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  overriddenOvertimeMinutes?: number;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  checkInMorning?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  checkOutMorning?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  checkInAfternoon?: string | null;

  @ApiPropertyOptional({ description: "HH:mm or ISO string" })
  @IsOptional()
  @IsString()
  checkOutAfternoon?: string | null;

  @ApiPropertyOptional({ description: "Lunch break in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number | null;

  @ApiPropertyOptional({ description: "Personal break in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  personalBreakMinutes?: number | null;

  @ApiPropertyOptional({ description: "Lunch duty in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  lunchDutyMinutes?: number | null;

  @ApiPropertyOptional({ description: "Duty 30K in minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  duty30kMinutes?: number | null;

  @ApiPropertyOptional({ description: "Night shift duty count (0 or 1)" })
  @IsOptional()
  nightShiftDutyCount?: number | null;

  @ApiPropertyOptional({ description: "Water booth duty count (0 or 1)" })
  @IsOptional()
  waterBoothDutyCount?: number | null;
}
