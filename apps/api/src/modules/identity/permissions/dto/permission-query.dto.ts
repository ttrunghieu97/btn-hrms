import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

export class PermissionQueryRequestDto extends SearchableQueryDto {
  @ApiPropertyOptional({
    description: "Deprecated alias for `search`",
    deprecated: true,
    example: "users:view",
  })
  @IsOptional()
  @Transform(({ value, obj }) =>
    typeof obj?.search === "string" && obj.search.trim() ? undefined : value,
  )
  @IsString()
  q?: string;

  getNormalizedSearch(): string | undefined {
    const search =
      typeof this.search === "string" && this.search.trim()
        ? this.search.trim()
        : typeof this.q === "string" && this.q.trim()
          ? this.q.trim()
          : undefined;

    return search || undefined;
  }
}
