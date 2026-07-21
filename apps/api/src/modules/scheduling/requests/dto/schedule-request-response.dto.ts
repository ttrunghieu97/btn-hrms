import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ScheduleRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  employeeName: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  requestType: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  reviewedBy?: string;

  @ApiPropertyOptional()
  reviewedAt?: string;

  @ApiProperty()
  createdAt: string;
}
