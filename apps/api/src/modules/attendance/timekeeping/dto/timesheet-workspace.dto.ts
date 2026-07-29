import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class TimesheetWorkspaceQueryDto {
  @ApiProperty({ description: "Period in YYYY-MM format" })
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/)
  period!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class TimesheetWorkspaceEmployeeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ nullable: true })
  departmentName!: string | null;
}

export class TimesheetWorkspaceRecordDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  workDate!: string;

  @ApiProperty({ nullable: true })
  status!: string | null;

  @ApiProperty({ nullable: true })
  checkIn!: string | null;

  @ApiProperty({ nullable: true })
  checkOut!: string | null;

  @ApiProperty({ nullable: true })
  workedMinutes!: number | null;

  @ApiProperty({ nullable: true })
  scheduledMinutes!: number | null;

  @ApiProperty({ nullable: true })
  lateMinutes!: number | null;

  @ApiProperty({ nullable: true })
  earlyLeaveMinutes!: number | null;

  @ApiProperty({ nullable: true })
  overtimeMinutes!: number | null;

  @ApiProperty({ nullable: true })
  isHoliday!: boolean | null;
}

export class TimesheetWorkspaceResponseDto {
  @ApiProperty()
  period!: string;

  @ApiProperty()
  periodStatus!: string;

  @ApiProperty({ type: [TimesheetWorkspaceEmployeeDto] })
  employees!: TimesheetWorkspaceEmployeeDto[];

  @ApiProperty({ type: [TimesheetWorkspaceRecordDto] })
  records!: TimesheetWorkspaceRecordDto[];
}
