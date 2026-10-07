import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

export class AuditLogQueryDto extends SearchableQueryDto {
  /**
   * Legacy offset-based pagination support.
   * If provided, `page` is derived from `offset` and `limit`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: "Deprecated alias for `search`",
    deprecated: true,
    example: "login",
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



