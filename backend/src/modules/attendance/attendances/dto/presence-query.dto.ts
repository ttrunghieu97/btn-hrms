import { IsOptional, IsString, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum PresenceStatus {
  ACTIVE = "ACTIVE",
  BREAK = "BREAK",
  UPCOMING = "UPCOMING",
  OFF_DUTY = "OFF_DUTY",
  LEAVE = "LEAVE",
  ABSENT = "ABSENT",
}

export class PresenceQueryDto {
  @ApiPropertyOptional({ description: "Department ID filter" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: "Location ID filter" })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    enum: PresenceStatus,
    description: "Real-time presence status filter",
  })
  @IsOptional()
  @IsEnum(PresenceStatus)
  status?: PresenceStatus;

  @ApiPropertyOptional({ description: "Comma-separated list of employee IDs" })
  @IsOptional()
  @IsString()
  employeeIds?: string;
}

export class PresenceItemDto {
  @ApiPropertyOptional()
  employeeId: string;

  @ApiPropertyOptional()
  employeeCode: string;

  @ApiPropertyOptional()
  fullName: string;

  @ApiPropertyOptional()
  avatar: string | null;

  @ApiPropertyOptional()
  departmentName: string | null;

  @ApiPropertyOptional()
  position: string | null;

  @ApiPropertyOptional({ enum: PresenceStatus })
  status: PresenceStatus;

  @ApiPropertyOptional()
  sessionId: string | null;

  @ApiPropertyOptional()
  checkInAt: string | null;

  @ApiPropertyOptional()
  workingDurationSeconds: number;

  @ApiPropertyOptional()
  shiftId: string | null;

  @ApiPropertyOptional()
  shiftName: string | null;
}

export class PresenceListResponseDto {
  @ApiPropertyOptional({ type: [PresenceItemDto] })
  items: PresenceItemDto[];
}

export class PresenceSummaryResponseDto {
  @ApiPropertyOptional()
  active: number;

  @ApiPropertyOptional()
  break: number;

  @ApiPropertyOptional()
  upcoming: number;

  @ApiPropertyOptional()
  offDuty: number;

  @ApiPropertyOptional()
  leave: number;

  @ApiPropertyOptional()
  absent: number;
}
