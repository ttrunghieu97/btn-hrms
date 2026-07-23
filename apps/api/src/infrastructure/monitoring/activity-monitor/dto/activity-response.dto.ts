import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ActivityResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  actorUserId: string;

  @ApiPropertyOptional({ example: "Nguyen Van A" })
  actorName?: string;

  @ApiProperty({ example: "employee_create" })
  action: string;

  @ApiProperty({ example: "employee" })
  entity: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  entityId?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt: string;
}

export class ActivityListEnvelopeDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  data: ActivityResponseDto[];

  @ApiProperty({
    type: "object",
    properties: {
      requestId: { type: "string" },
      timestamp: { type: "string" },
      pagination: {
        type: "object",
        properties: {
          total: { type: "number" },
          page: { type: "number" },
          limit: { type: "number" },
          hasNext: { type: "boolean" },
        },
      },
    },
  })
  meta: Record<string, unknown>;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
