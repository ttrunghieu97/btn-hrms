import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { CheckAttendanceImageSource } from "./check-attendance.dto";

export class CreateAttendanceDto {
  @ApiProperty({ enum: ["check_in", "check_out", "break_start", "break_end"] })
  @IsString()
  @IsNotEmpty()
  @IsIn(["check_in", "check_out", "break_start", "break_end"])
  type: "check_in" | "check_out" | "break_start" | "break_end";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: "Latitude for field workers" })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({ description: "Longitude for field workers" })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: ["camera", "upload"] })
  @IsOptional()
  @IsString()
  @IsIn(["camera", "upload"])
  imageSource?: CheckAttendanceImageSource;
}



