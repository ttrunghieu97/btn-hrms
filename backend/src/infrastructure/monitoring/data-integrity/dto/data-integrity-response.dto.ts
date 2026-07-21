import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IntegrityIssueDto {
  @ApiProperty({ example: "employee" })
  domain: string;

  @ApiProperty({ example: "employees_without_department" })
  check: string;

  @ApiProperty({ example: "Employees without department assignment" })
  description: string;

  @ApiProperty({ example: "warning", enum: ["critical", "warning", "info"] })
  severity: string;

  @ApiProperty({ example: 5 })
  count: number;

  @ApiPropertyOptional({ example: "Ensure all active employees have a department" })
  recommendation?: string;
}

export class DataIntegrityResponseDto {
  @ApiProperty({ type: [IntegrityIssueDto] })
  issues: IntegrityIssueDto[];

  @ApiProperty({ example: 3 })
  totalIssues: number;

  @ApiProperty({ example: 1 })
  criticalCount: number;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  checkedAt: string;
}

export class DataIntegrityEnvelopeDto {
  @ApiProperty({ type: DataIntegrityResponseDto })
  data: DataIntegrityResponseDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
