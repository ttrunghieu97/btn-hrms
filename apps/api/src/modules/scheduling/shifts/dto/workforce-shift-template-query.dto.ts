import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
} from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

export class WorkforceShiftTemplateQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional({ enum: ["draft", "published", "archived"] })
  @IsOptional()
  @IsIn(["draft", "published", "archived"])
  status?: "draft" | "published" | "archived";
}

