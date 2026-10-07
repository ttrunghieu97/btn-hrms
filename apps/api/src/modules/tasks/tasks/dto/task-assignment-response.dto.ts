import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiPropertyOptional()
  employeeId?: string | null;

  @ApiPropertyOptional()
  assignedByUserId?: string | null;

  @ApiProperty()
  assignedAt!: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeCode: string;
    avatar?: string | null;
    departmentName?: string | null;
  };

  @ApiPropertyOptional()
  assignedBy?: {
    id: string;
    username: string;
    email?: string | null;
  };
}
