import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Request,
  ParseUUIDPipe,
  ParseEnumPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { SchedulePolicies } from "../../../core/security/policies/schedule.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreateScheduleRequestUseCase } from "./use-cases/create-schedule-request.usecase";
import { ListScheduleRequestsUseCase } from "./use-cases/list-schedule-requests.usecase";
import { ReviewScheduleRequestUseCase } from "./use-cases/review-schedule-request.usecase";
import { CreateScheduleRequestDto, ScheduleRequestType } from "./dto/create-schedule-request.dto";
import { ReviewScheduleRequestDto, ReviewAction } from "./dto/review-schedule-request.dto";
import { mapScheduleRequestToDto } from "./mappers/schedule-request.mapper";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("Schedule Requests")
@ApiBearerAuth()
@Controller("schedule-requests")
export class ScheduleRequestsController {
  constructor(
    private readonly createUseCase: CreateScheduleRequestUseCase,
    private readonly listUseCase: ListScheduleRequestsUseCase,
    private readonly reviewUseCase: ReviewScheduleRequestUseCase
  ) {}

  @Post()
  @CheckPolicy(SchedulePolicies.create)
  @AuditLog({ action: "schedule_request_create", entity: "schedule_request" })
  @ApiOperation({ summary: "Submit a schedule request (employee)" })
  async create(
    @Body() dto: CreateScheduleRequestDto,
    @Request() req: Request & { user: AuthUser }
  ) {
    if (!req.user.employeeId) { throwBadRequest("Employee profile not found", "PROFILE_MISSING"); }
    const employeeId = req.user.employeeId;
    const record = await this.createUseCase.execute(employeeId, {
      requestType: dto.requestType,
      date: dto.date,
      reason: dto.reason,
    });
    return mapScheduleRequestToDto({
      ...record,
      employee: null,
    });
  }

  @Get()
  @RequirePermission("schedule:view:self")
  @ApiOperation({ summary: "List schedule requests. HR sees all, ?employeeId= filters." })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "employeeId", required: false })
  async list(
    @Request() req: Request & { user: AuthUser },
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string
  ) {
    const isHR = req.user.permissions?.includes("schedule:manage");
    const filters: { status?: string; employeeId?: string } = {};

    if (status) filters.status = status;
    if (employeeId) filters.employeeId = employeeId;
    // Non-HR employees see only their own
    if (!isHR) filters.employeeId = req.user.employeeId;

    const records = await this.listUseCase.execute(filters);
    return records.map(mapScheduleRequestToDto);
  }

  @Post(":id/approve")
  @RequirePermission("schedule:edit:all")
  @AuditLog({ action: "schedule_request_approve", entity: "schedule_request" })
  @ApiOperation({ summary: "Approve a schedule request (HR)" })
  async approve(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: Request & { user: AuthUser }
  ) {
    const record = await this.reviewUseCase.execute(id, "APPROVED", req.user.id);
    const withEmployee = await this.listUseCase.execute({ employeeId: record.employeeId });
    const full = withEmployee.find((r) => r.id === id);
    return mapScheduleRequestToDto(full ?? { ...record, employee: null });
  }

  @Post(":id/deny")
  @RequirePermission("schedule:edit:all")
  @AuditLog({ action: "schedule_request_deny", entity: "schedule_request" })
  @ApiOperation({ summary: "Deny a schedule request (HR)" })
  async deny(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: Request & { user: AuthUser }
  ) {
    const record = await this.reviewUseCase.execute(id, "DENIED", req.user.id);
    const withEmployee = await this.listUseCase.execute({ employeeId: record.employeeId });
    const full = withEmployee.find((r) => r.id === id);
    return mapScheduleRequestToDto(full ?? { ...record, employee: null });
  }
}
