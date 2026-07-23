import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

const ISSUE_LINE_STATUSES = ["open", "returned"] as const;

export class IssueQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiPropertyOptional({
    enum: ISSUE_LINE_STATUSES,
    description: "Filter to issues that have at least one line in this state.",
  })
  @IsOptional()
  @IsIn(ISSUE_LINE_STATUSES)
  lineStatus?: (typeof ISSUE_LINE_STATUSES)[number];
}
