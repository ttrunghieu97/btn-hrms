import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { FieldSelectableQueryDto, PaginationLimitField } from "../../../../shared/dto/pagination.dto";

export class DepartmentQueryDto extends FieldSelectableQueryDto {
  @ApiPropertyOptional({ description: "Filter by department name", example: "Engineering" })
  @IsOptional()
  @IsString()
  name?: string;

  @PaginationLimitField(100)
  limit = 20;
}

