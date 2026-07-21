import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TimelineEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    enum: ['system', 'status', 'contract', 'position'],
  })
  type: string;

  @ApiProperty({
    enum: [
      'employee_created',
      'status_changed',
      'contract_created',
      'contract_renewed',
      'contract_amended',
      'contract_ended',
      'contract_expired',
      'assignment_created',
      'position_changed',
    ],
  })
  event: string;

  @ApiProperty()
  occurredAt: Date;

  @ApiProperty({ type: String, nullable: true })
  actorName: string | null;

  @ApiProperty({ example: 1 })
  metadataVersion: number;

  @ApiProperty()
  metadata: Record<string, unknown>;
}

export class TimelineEnvelopeDto {
  @ApiProperty({ type: [TimelineEventDto] })
  data: TimelineEventDto[];

  @ApiProperty({ type: Object })
  meta: { requestId: string; timestamp: string };

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated event types to filter (system,status,contract,position)',
    example: 'status,contract',
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({
    description: 'Max number of events to return (default 20, max 50)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
