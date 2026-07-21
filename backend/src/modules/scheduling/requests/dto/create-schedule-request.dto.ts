import { IsEnum, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ScheduleRequestType {
  MORNING_OFF = "MORNING_OFF",
  AFTERNOON_OFF = "AFTERNOON_OFF",
  FULL_DAY_OFF = "FULL_DAY_OFF",
}

export class CreateScheduleRequestDto {
  @ApiProperty({ enum: ScheduleRequestType })
  @IsEnum(ScheduleRequestType)
  requestType: ScheduleRequestType;

  @ApiProperty({ example: "2026-06-25" })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
