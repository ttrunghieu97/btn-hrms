import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { SearchableQueryDto } from "../../../../shared/dto/pagination.dto";

export class CandidateQueryDto extends SearchableQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  postingId?: string;
}
