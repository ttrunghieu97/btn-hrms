import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

class PayrollPeriodSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;
}

export class PayrollRunResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  payrollPeriodId: string;

  @ApiProperty({ type: String, nullable: true })
  branchId: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: String, nullable: true })
  approvedByUserId: string | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  approvedAt: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  processedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: PayrollPeriodSummaryDto })
  payrollPeriod?: PayrollPeriodSummaryDto;
}

export class PayrollRunEnvelopeDto {
  @ApiProperty({ type: PayrollRunResponseDto })
  data: PayrollRunResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class PayrollRunListEnvelopeDto {
  @ApiProperty({ type: [PayrollRunResponseDto] })
  data: PayrollRunResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}



