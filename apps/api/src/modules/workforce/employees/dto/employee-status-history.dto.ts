import { ApiProperty } from "@nestjs/swagger";

export class EmployeeStatusHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ["working", "probation", "terminated", "leave", "suspended", "retired"] })
  status: string;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty()
  changedAt: Date;

  @ApiProperty({ type: String, nullable: true })
  changedByUserId: string | null;

  @ApiProperty({ type: String, nullable: true })
  changedByName: string | null;
}

export class EmployeeStatusHistoryEnvelopeDto {
  @ApiProperty({ type: [EmployeeStatusHistoryItemDto] })
  data: EmployeeStatusHistoryItemDto[];

  @ApiProperty({ type: Object })
  meta: { requestId: string; timestamp: string };

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
