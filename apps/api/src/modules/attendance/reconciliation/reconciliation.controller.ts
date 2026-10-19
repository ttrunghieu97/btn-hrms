import { Controller, Get, Post, Param, Body, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsIn } from "class-validator";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { RecordAttendanceEventUseCase } from "./use-cases/record-attendance-event.usecase";
import { ReconcileAttendanceDayUseCase } from "./use-cases/reconcile-attendance-day.usecase";

class CreateEventDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: ["CLOCK_IN", "CLOCK_OUT"] })
  @IsIn(["CLOCK_IN", "CLOCK_OUT"])
  type!: "CLOCK_IN" | "CLOCK_OUT";

  @ApiProperty()
  @IsString()
  timestamp!: string;

  @ApiProperty({ enum: ["DEVICE", "MANUAL"], required: false })
  @IsOptional()
  @IsIn(["DEVICE", "MANUAL"])
  source?: "DEVICE" | "MANUAL";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locationId?: string;
}

@ApiTags("Attendance Reconciliation")
@ApiBearerAuth()
@Controller()
export class ReconciliationController {
  constructor(
    private readonly eventRecorder: RecordAttendanceEventUseCase,
    private readonly reconcileDay: ReconcileAttendanceDayUseCase,
  ) {}

  @Post("events")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "Record a clock-in/clock-out event" })
  @ApiOkResponse({ description: "Event recorded successfully" })
  async recordEvent(@Body() dto: CreateEventDto) {
    return this.eventRecorder.execute({
      employeeId: dto.employeeId,
      type: dto.type,
      timestamp: dto.timestamp,
      source: dto.source,
      locationId: dto.locationId,
    });
  }

  @Get(":date")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "Reconcile attendance for a date: sessions + violations" })
  @ApiOkResponse({ description: "Reconciliation result" })
  async reconcile(
    @Param("date") date: string,
    @Query("employeeId") employeeId?: string,
  ) {
    return this.reconcileDay.execute(date, employeeId);
  }
}
