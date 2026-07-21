import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { FieldSelectableQueryDto } from "../../../../shared/dto/pagination.dto";

export class LocationQueryDto extends FieldSelectableQueryDto {
  @ApiPropertyOptional({ description: "Filter by name (partial match)" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Filter by parent location ID" })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: "Filter by type" })
  @IsString()
  @IsOptional()
  type?: string;
}


