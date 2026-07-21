import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class AttendanceClockEventQueryDto extends PagedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ enum: ["mobile", "web", "api", "manual"] })
  @IsOptional()
  @IsIn(["mobile", "web", "api", "manual"])
  source?: "mobile" | "web" | "api" | "manual";

}



