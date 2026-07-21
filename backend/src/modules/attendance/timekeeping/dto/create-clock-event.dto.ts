import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

export class CreateClockEventDto {
  @ApiPropertyOptional({
    description: "Target employee, optional for self check-in/check-out",
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({
    enum: ["check_in", "check_out", "break_start", "break_end", "note"],
  })
  @IsIn(["check_in", "check_out", "break_start", "break_end", "note"])
  type!: "check_in" | "check_out" | "break_start" | "break_end" | "note";

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate?: string;

  @ApiPropertyOptional({
    description: "ISO timestamp, defaults to current time",
  })
  @IsOptional()
  @IsString()
  eventTime?: string;

  @ApiPropertyOptional({ enum: ["mobile", "web", "api", "manual"] })
  @IsOptional()
  @IsIn(["mobile", "web", "api", "manual"])
  source?: "mobile" | "web" | "api" | "manual";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ enum: ["morning", "noon", "afternoon"] })
  @IsOptional()
  @IsIn(["morning", "noon", "afternoon"])
  session?: "morning" | "noon" | "afternoon";
}

export class CreateManualCorrectionDto extends CreateClockEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  correctedAttendanceId?: string;
}



