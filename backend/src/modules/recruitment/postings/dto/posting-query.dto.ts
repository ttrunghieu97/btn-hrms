import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

const POSTING_STATUSES = ["open", "paused", "closed"] as const;

export class PostingQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requisitionId?: string;

  @ApiPropertyOptional({ enum: POSTING_STATUSES })
  @IsOptional()
  @IsIn(POSTING_STATUSES)
  status?: (typeof POSTING_STATUSES)[number];
}
