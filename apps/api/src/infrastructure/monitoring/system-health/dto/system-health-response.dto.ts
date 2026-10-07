import { ApiProperty } from "@nestjs/swagger";

export class ComponentHealthDto {
  @ApiProperty({ example: "database" })
  name: string;

  @ApiProperty({ example: "healthy", enum: ["healthy", "degraded", "down"] })
  status: string;

  @ApiProperty({ example: 5 })
  latencyMs: number;

  @ApiProperty({ required: false, example: null })
  error?: string | null;
}

export class SystemHealthResponseDto {
  @ApiProperty({ example: "healthy", enum: ["healthy", "degraded", "down"] })
  overallStatus: string;

  @ApiProperty({ type: [ComponentHealthDto] })
  components: ComponentHealthDto[];

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  checkedAt: string;

  @ApiProperty({ example: 42 })
  totalLatencyMs: number;
}

export class SystemHealthEnvelopeDto {
  @ApiProperty({ type: SystemHealthResponseDto })
  data: SystemHealthResponseDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
