import { ApiProperty } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  parentId: string | null;

  @ApiProperty()
  employeeCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DepartmentListEnvelopeDto {
  @ApiProperty({ type: [DepartmentResponseDto] })
  data: DepartmentResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class DepartmentEnvelopeDto {
  @ApiProperty({ type: DepartmentResponseDto })
  data: DepartmentResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

