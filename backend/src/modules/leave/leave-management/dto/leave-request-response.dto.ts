import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LeaveRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  leaveTypeId!: string;

  @ApiPropertyOptional()
  approverUserId?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({
    description:
      "Normalized lifecycle status (submitted/canceled aliases for pending/cancelled)",
  })
  lifecycleStatus!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  startSession!: string;

  @ApiProperty()
  endSession!: string;

  @ApiProperty()
  totalUnits!: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiProperty()
  requestedAt!: Date;

  @ApiPropertyOptional()
  approvedAt?: Date | null;

  @ApiPropertyOptional()
  rejectedAt?: Date | null;

  @ApiPropertyOptional()
  cancelledAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    departmentName?: string | null;
  };

  @ApiPropertyOptional()
  leaveType?: {
    id: string;
    code: string;
    name: string;
    unit: string;
    isPaid: boolean;
  };

  @ApiPropertyOptional()
  approver?: {
    id: string;
    username: string;
    email?: string | null;
  } | null;
}


