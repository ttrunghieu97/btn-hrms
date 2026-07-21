import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

const REQUEST_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
  "fulfilled",
] as const;

export class RequestQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requesterEmployeeId?: string;

  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];
}
