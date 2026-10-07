import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

const REQUISITION_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "closed",
] as const;

export class RequisitionQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: REQUISITION_STATUSES })
  @IsOptional()
  @IsIn(REQUISITION_STATUSES)
  status?: (typeof REQUISITION_STATUSES)[number];
}
