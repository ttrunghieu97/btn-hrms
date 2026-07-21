import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class ReassignTaskDto {
  @ApiProperty({ description: "Employee UUID to reassign the task to" })
  @IsUUID()
  @IsNotEmpty()
  assigneeId!: string;

  @ApiPropertyOptional({ description: "Reason for reassignment" })
  @IsOptional()
  @IsString()
  reason?: string;
}
