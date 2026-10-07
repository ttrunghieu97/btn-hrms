import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsUUID,
  Matches,
} from "class-validator";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class AttendanceTimesheetQueryDto extends PagedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiPropertyOptional({
    description:
      "When false, unresolved-exception rows are excluded from payable totals",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeUnresolvedAsPayable?: boolean = false;

}



