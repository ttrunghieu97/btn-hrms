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

  @ApiProperty({ type: String, nullable: true })
  departmentName!: string | null;

  @ApiProperty()
  workingDays!: number;

  @ApiProperty()
  totalDays!: number;

  @ApiProperty()
  completionRate!: number;

  @ApiProperty()
  lateCount!: number;

  @ApiProperty()
  leaveCount!: number;

  @ApiProperty()
  absentCount!: number;

  @ApiProperty()
  otMinutes!: number;

  @ApiProperty()
  workedMinutes!: number;
}

export class TimesheetWorkspaceRecordDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  workDate!: string;

  @ApiProperty({ type: String, nullable: true })
  status!: string | null;

  @ApiProperty({ type: String, nullable: true })
  checkIn!: string | null;

  @ApiProperty({ type: String, nullable: true })
  checkOut!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  workedMinutes!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  scheduledMinutes!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  lateMinutes!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  earlyLeaveMinutes!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  overtimeMinutes!: number | null;

  @ApiProperty({ type: Boolean, nullable: true })
  isHoliday!: boolean | null;
}

export class TimesheetWorkspacePeriodTotalsDto {
  @ApiProperty() totalEmployees!: number;
  @ApiProperty() completedEmployees!: number;
  @ApiProperty() inProgressEmployees!: number;
  @ApiProperty() notStartedEmployees!: number;
  @ApiProperty() totalWorkedMinutes!: number;
  @ApiProperty() totalOtMinutes!: number;
  @ApiProperty() totalLateCount!: number;
  @ApiProperty() totalLeaveCount!: number;
}

export class TimesheetWorkspaceResponseDto {
  @ApiProperty()
  period!: string;

  @ApiProperty()
  periodStatus!: string;

  @ApiProperty({ type: [String] })
  availableActions!: string[];

  @ApiProperty({ type: TimesheetWorkspacePeriodTotalsDto })
  totals!: TimesheetWorkspacePeriodTotalsDto;

  @ApiProperty({ type: [TimesheetWorkspaceEmployeeDto] })
  employees!: TimesheetWorkspaceEmployeeDto[];

  @ApiProperty({ type: [TimesheetWorkspaceRecordDto] })
  records!: TimesheetWorkspaceRecordDto[];
}
