import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { AttendanceClockEventQueryDto } from "./dto/attendance-clock-event-query.dto";
import { AttendanceExceptionQueryDto } from "./dto/attendance-exception-query.dto";
import { AttendanceTimesheetQueryDto } from "./dto/attendance-timesheet-query.dto";
import {
  CreateClockEventDto,
  CreateManualCorrectionDto,
} from "./dto/create-clock-event.dto";
import { OverrideAttendanceSummaryDto } from "./dto/override-attendance-summary.dto";
import { AttendanceCapturePolicyService } from "../attendances/services/attendance-capture-policy.service";
import { ResolveAttendanceExceptionDto } from "./dto/resolve-attendance-exception.dto";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { CreateClockEventUseCase } from "./use-cases/create-clock-event.usecase";
import { CreateManualCorrectionUseCase } from "./use-cases/create-manual-correction.usecase";
import { ListAttendanceExceptionsUseCase } from "./use-cases/list-attendance-exceptions.usecase";
import { ListClockEventsUseCase } from "./use-cases/list-clock-events.usecase";
import { OverrideAttendanceSummaryUseCase } from "./use-cases/override-attendance-summary.usecase";
import { QueryAttendanceTimesheetUseCase } from "./use-cases/query-attendance-timesheet.usecase";
import { ResolveAttendanceExceptionUseCase } from "./use-cases/resolve-attendance-exception.usecase";
import { TimesheetService } from "./services/timesheet.service";
import { PeriodLockService } from "./services/period-lock.service";
import { QueryTimesheetWorkspaceUseCase } from "./use-cases/query-timesheet-workspace.usecase";
import {
  BatchTimesheetDto,
  BatchTimesheetResponseDto,
  LockPeriodDto,
  UnlockPeriodDto,
  PeriodLockResponseDto,
} from "./dto/timesheet.dto";
import {
  TimesheetWorkspaceQueryDto,
  TimesheetWorkspaceResponseDto,
} from "./dto/timesheet-workspace.dto";

@ApiTags("Attendance Timekeeping")
@ApiBearerAuth()
@Controller()
export class TimekeepingController {
  constructor(
    private readonly createClockEvent: CreateClockEventUseCase,
    private readonly createManualCorrection: CreateManualCorrectionUseCase,
    private readonly listClockEvents: ListClockEventsUseCase,
    private readonly listExceptions: ListAttendanceExceptionsUseCase,
    private readonly resolveException: ResolveAttendanceExceptionUseCase,
    private readonly overrideSummary: OverrideAttendanceSummaryUseCase,
    private readonly queryTimesheet: QueryAttendanceTimesheetUseCase,
    private readonly attendanceCapturePolicy: AttendanceCapturePolicyService,
    private readonly timesheetService: TimesheetService,
    private readonly periodLockService: PeriodLockService,
    private readonly queryTimesheetWorkspace: QueryTimesheetWorkspaceUseCase,
  ) {}

  @Post("clock-events")
  @Idempotent("POST:/clock-events")
  @CheckPolicy(AttendancePolicies.check)
  @AuditLog({ action: "attendance_clock_event_create", entity: "attendance" })
  @ApiOperation({ summary: "Capture attendance clock event" })
  @ApiOkResponse({ description: "Clock event captured" })
  async captureClockEvent(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: CreateClockEventDto,
  ) {
    if (body.type === "check_in" || body.type === "check_out") {
      this.attendanceCapturePolicy.assertImageSourceAllowed("upload");
    }
    return this.createClockEvent.execute(
      req.user.id,
      req.user.employeeId ?? "",
      body,
    );
  }

  @Post("corrections")
  @CheckPolicy(AttendancePolicies.report)
  @AuditLog({ action: "attendance_correction_create", entity: "attendance" })
  @ApiOperation({ summary: "Create manual attendance correction" })
  @ApiOkResponse({ description: "Manual correction created" })
  async manualCorrection(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: CreateManualCorrectionDto,
  ) {
    return this.createManualCorrection.execute(req.user.id, body);
  }

  @Get("clock-events")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "List attendance clock events" })
  @ApiOkResponse({ description: "List of clock events" })
  async listEvents(@Query() query: AttendanceClockEventQueryDto) {
    return this.listClockEvents.execute(query);
  }

  @Get("exceptions")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "List attendance exceptions" })
  @ApiOkResponse({ description: "List of exceptions" })
  async listAttendanceExceptions(@Query() query: AttendanceExceptionQueryDto) {
    return this.listExceptions.execute(query);
  }

  @Patch("exceptions/:id/resolve")
  @CheckPolicy(AttendancePolicies.report)
  @AuditLog({
    action: "attendance_exception_resolve",
    entity: "attendance_exception",
  })
  @ApiOperation({ summary: "Resolve attendance exception" })
  @ApiOkResponse({ description: "Exception resolved" })
  async resolveAttendanceException(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: ResolveAttendanceExceptionDto,
  ) {
    return this.resolveException.execute(id, req.user.id, body);
  }

  @Post("summary-overrides")
  @CheckPolicy(AttendancePolicies.report)
  @AuditLog({
    action: "attendance_summary_override",
    entity: "attendance_summary",
  })
  @ApiOperation({ summary: "Create/update attendance summary override" })
  @ApiOkResponse({ description: "Summary override saved" })
  async overrideAttendanceSummary(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: OverrideAttendanceSummaryDto,
  ) {
    return this.overrideSummary.execute(req.user.id, body);
  }

  @Get("timesheets")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "Query attendance timesheet summaries" })
  @ApiOkResponse({ description: "Timesheet summaries" })
  async queryAttendanceTimesheet(
    @Query() query: AttendanceTimesheetQueryDto,
  ) {
    return this.queryTimesheet.execute(query);
  }

  // ─── Timesheet Batch ──────────────────────────────────────────────

  @Post("timesheets/batch")
  @CheckPolicy(AttendancePolicies.timesheetManage)
  @AuditLog({ action: "timesheet_batch_save", entity: "attendance" })
  @ApiOperation({ summary: "Batch save attendance timesheet records" })
  @ApiOkResponse({ type: BatchTimesheetResponseDto })
  async batchSaveTimesheet(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() dto: BatchTimesheetDto,
  ): Promise<BatchTimesheetResponseDto> {
    return this.timesheetService.batchSave(req.user.id, dto);
  }

  // ─── Period Locks ──────────────────────────────────────────────────

  @Post("period-locks/lock")
  @CheckPolicy(AttendancePolicies.periodLock)
  @AuditLog({ action: "period_lock_lock", entity: "attendance" })
  @ApiOperation({ summary: "Lock attendance period" })
  @ApiOkResponse({ description: "Period locked" })
  async lockPeriod(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() dto: LockPeriodDto,
  ) {
    const lock = await this.periodLockService.lock(
      req.user.id,
      dto.period,
      dto.remarks,
    );
    return this.toPeriodLockResponse(lock);
  }

  @Post("period-locks/unlock")
  @CheckPolicy(AttendancePolicies.periodUnlock)
  @AuditLog({ action: "period_lock_unlock", entity: "attendance" })
  @ApiOperation({ summary: "Unlock attendance period (requires elevated privilege)" })
  @ApiOkResponse({ description: "Period unlocked" })
  async unlockPeriod(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() dto: UnlockPeriodDto,
  ) {
    const lock = await this.periodLockService.unlock(
      req.user.id,
      dto.period,
      dto.remarks,
    );
    return this.toPeriodLockResponse(lock);
  }

  @Get("timesheet-workspace")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "Get timesheet workspace data for a period" })
  @ApiOkResponse({ type: TimesheetWorkspaceResponseDto })
  async getTimesheetWorkspace(
    @Query() query: TimesheetWorkspaceQueryDto,
  ): Promise<TimesheetWorkspaceResponseDto> {
    return this.queryTimesheetWorkspace.execute(query);
  }

  @Get("period-locks/:period")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "Get attendance period lock status" })
  @ApiOkResponse({ description: "Period lock status" })
  async getPeriodLock(
    @Param("period") period: string,
  ): Promise<{ data: PeriodLockResponseDto | null }> {
    const lock = await this.periodLockService.getPeriodLock(period);
    return { data: lock ? this.toPeriodLockResponse(lock) : null };
  }

  private toPeriodLockResponse(lock: any): PeriodLockResponseDto {
    return {
      id: lock.id,
      period: lock.period,
      status: lock.status,
      lockedByUserId: lock.lockedByUserId,
      lockedAt: lock.lockedAt,
      unlockedByUserId: lock.unlockedByUserId,
      unlockedAt: lock.unlockedAt,
      remarks: lock.remarks,
    };
  }
}



