import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsDateString } from "class-validator";

export class TaskAnalyticsQueryDto {
  @ApiPropertyOptional({ description: "Filter by department UUID" })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
