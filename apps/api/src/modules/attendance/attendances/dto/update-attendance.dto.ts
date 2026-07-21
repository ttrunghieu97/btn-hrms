import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    enum: ["check_in", "check_out", "break_start", "break_end", "note"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["check_in", "check_out", "break_start", "break_end", "note"])
  type?: "check_in" | "check_out" | "break_start" | "break_end" | "note";

  @ApiPropertyOptional({ enum: ["morning", "noon", "afternoon"] })
  @IsOptional()
  @IsString()
  @IsIn(["morning", "noon", "afternoon"])
  session?: "morning" | "noon" | "afternoon";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}



