import { ApiProperty } from "@nestjs/swagger";

export class LeaveBalanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  balanceYear!: number;

  @ApiProperty()
  openingBalance!: string;

  @ApiProperty()
  accruedAmount!: string;

  @ApiProperty()
  usedAmount!: string;

  @ApiProperty()
  carriedOverAmount!: string;

  @ApiProperty()
  adjustedAmount!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  leaveType!: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
}


