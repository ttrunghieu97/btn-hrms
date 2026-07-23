import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

const ASSET_STATUSES = [
  "available",
  "assigned",
  "maintenance",
  "retired",
  "lost",
] as const;

export class AssetQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assetTypeId?: string;

  @ApiPropertyOptional({ enum: ASSET_STATUSES })
  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: (typeof ASSET_STATUSES)[number];
}
