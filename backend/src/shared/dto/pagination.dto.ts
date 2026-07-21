import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const PAGINATION_MAX_LIMIT = 100;

export function clampPaginationLimit(value: unknown, max = PAGINATION_MAX_LIMIT) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

export function PaginationLimitField(
  max = PAGINATION_MAX_LIMIT,
  defaultValue = 20,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    ApiPropertyOptional({
      default: defaultValue,
      minimum: 1,
      maximum: max,
      example: defaultValue,
    })(target, propertyKey);
    IsOptional()(target, propertyKey);
    Transform(({ value }) => clampPaginationLimit(value, max))(target, propertyKey);
    IsInt()(target, propertyKey);
    Min(1)(target, propertyKey);
    Max(max)(target, propertyKey);
  };
}

export function PaginationPageField(defaultValue = 1): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    ApiPropertyOptional({
      default: defaultValue,
      minimum: 1,
      example: defaultValue,
    })(target, propertyKey);
    IsOptional()(target, propertyKey);
    Type(() => Number)(target, propertyKey);
    IsInt()(target, propertyKey);
    Min(1)(target, propertyKey);
  };
}

export class PagedQueryDto {
  @PaginationPageField()
  page = 1;

  @PaginationLimitField()
  limit = 20;
}

export class SearchableQueryDto extends PagedQueryDto {
  @ApiPropertyOptional({ description: "Free-text search", example: "john" })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SortableQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional({
    description: "Sorting spec (e.g. 'createdAt:desc' or '-createdAt')",
    example: "createdAt:desc",
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class ExpandableQueryDto extends SortableQueryDto {
  @ApiPropertyOptional({
    description: "Comma-separated relations to include",
    example: "department,manager",
  })
  @IsOptional()
  @IsString()
  include?: string;
}

export class FieldSelectableQueryDto extends ExpandableQueryDto {
  @ApiPropertyOptional({
    description: "Comma-separated fields selection",
    example: "id,name,createdAt",
  })
  @IsOptional()
  @IsString()
  fields?: string;
}

export class PaginationDto extends FieldSelectableQueryDto {}

/**
 * Repository-level defensive clamp. Call in repository methods to guarantee
 * the limit is safe even if DTO validation is bypassed (e.g. internal calls).
 */
export function safeLimit(
  limit: number | undefined,
  max = PAGINATION_MAX_LIMIT,
): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(Math.trunc(n), max);
}

/**
 * Repository-level defensive clamp for page number.
 */
export function safePage(page: number | undefined): number {
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.trunc(n);
}
