import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  actorUserId?: string | null;

  @ApiPropertyOptional({
    description: "Actor (user) information for display in admin UIs.",
  })
  actor?: {
    id: string;
    username: string;
    email?: string | null;
  } | null;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entity: string;

  @ApiPropertyOptional()
  entityId?: string | null;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'FAILED'] })
  result?: 'SUCCESS' | 'FAILED' | null;

  @ApiPropertyOptional({ description: 'Machine-readable reason code for FAILED results.' })
  reason?: string | null;

  @ApiPropertyOptional({ description: 'Trace/request ID for correlation with HTTP logs.' })
  traceId?: string | null;

  @ApiPropertyOptional()
  metadata?: unknown;

  @ApiProperty()
  createdAt: Date;
}
