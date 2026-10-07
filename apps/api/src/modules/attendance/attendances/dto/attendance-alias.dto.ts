import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import type { CheckAttendanceImageSource } from "./check-attendance.dto";

export class AttendanceAliasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiPropertyOptional({ enum: ["camera", "upload"] })
  @IsOptional()
  @IsString()
  @IsIn(["camera", "upload"])
  imageSource?: CheckAttendanceImageSource;
}
