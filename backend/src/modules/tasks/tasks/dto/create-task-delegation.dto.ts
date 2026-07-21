import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsDateString } from "class-validator";

export class CreateTaskDelegationDto {
  @ApiProperty()
  @IsUUID()
  delegateeUserId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description:
      "When set, creates a department-scoped delegation: grants approval authority over tasks " +
      "assigned to any employee in this department. Requires admin-level permission. " +
      "When omitted, delegation is creator-scoped (applies only to tasks created by the delegator).",
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
