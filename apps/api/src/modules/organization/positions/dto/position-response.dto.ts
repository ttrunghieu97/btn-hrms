import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto } from "../../../../shared/dto/api-response.dto";

export class PositionListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  employeeCount: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  jobCategory?: string | null;
}

export class PositionListEnvelopeDto {
  @ApiProperty({ type: [PositionListItemDto] })
  data: PositionListItemDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
