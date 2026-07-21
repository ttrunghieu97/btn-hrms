import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

export class AssetTypeQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional({
    description: "Filter by trackable flag",
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" || value === true
      ? true
      : value === "false" || value === false
        ? false
        : value,
  )
  @IsBoolean()
  isTrackable?: boolean;
}
