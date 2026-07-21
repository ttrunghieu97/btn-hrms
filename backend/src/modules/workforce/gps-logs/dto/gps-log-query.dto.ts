import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsDateString } from "class-validator";

export class GPSLogQueryDto {
  @ApiPropertyOptional({ description: "Filter by employee ID" })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Filter by date (YYYY-MM-DD)" })
  @IsDateString()
  @IsOptional()
  date?: string;
}

