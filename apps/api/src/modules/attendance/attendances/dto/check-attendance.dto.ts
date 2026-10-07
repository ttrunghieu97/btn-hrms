import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export type CheckAttendanceImageSource = "camera" | "upload";

export class CheckAttendanceDto {
  @ApiProperty({ description: "ISO date (YYYY-MM-DD)" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional({ enum: ["morning", "noon", "afternoon"] })
  @IsOptional()
  @IsString()
  @IsIn(["morning", "noon", "afternoon"])
  session?: "morning" | "noon" | "afternoon";

  @ApiProperty({ enum: ["checkin", "checkout", "check", "note"] })
  @IsString()
  @IsNotEmpty()
  @IsIn(["checkin", "checkout", "check", "note"])
  type!: "checkin" | "checkout" | "check" | "note";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: "Latitude for field workers" })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({ description: "Longitude for field workers" })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiPropertyOptional({ description: "Location string for legacy support" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ["indoor", "outdoor"], description: "Lunch duty type (indoor/outdoor)" })
  @IsOptional()
  @IsString()
  @IsIn(["indoor", "outdoor"])
  lunchDutyType?: "indoor" | "outdoor";

  @ApiPropertyOptional({ enum: ["camera", "upload"] })
  @IsOptional()
  @IsString()
  @IsIn(["camera", "upload"])
  imageSource?: CheckAttendanceImageSource;
}
