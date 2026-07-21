import { Controller, Get, Post, Body, Query, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { AttendanceQueryDto } from "./dto/attendance-query.dto";
import { AttendanceEnvelopeDto, AttendanceListEnvelopeDto, TodayAttendanceEnvelopeDto } from "./dto/attendance-response.dto";
import { ListAttendancesUseCase } from "./use-cases/list-attendances.usecase";
import { ListMyAttendanceUseCase } from "./use-cases/list-my-attendance.usecase";
import { GetCheckedInTodayUseCase } from "./use-cases/get-checked-in-today.usecase";
import { GetMyDailyRecordsUseCase } from "./use-cases/get-my-daily-records.usecase";
import { GetTodayAttendanceUseCase } from "./use-cases/get-today-attendance.usecase";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

import { PresenceQueryDto, PresenceListResponseDto, PresenceSummaryResponseDto } from "./dto/presence-query.dto";
import { GetEmployeesPresenceUseCase } from "./use-cases/get-employees-presence.usecase";

@ApiTags("Attendance Queries")
@ApiBearerAuth()
@Controller()
export class AttendanceQueryController {
  constructor(
    private readonly listAttendances: ListAttendancesUseCase,
    private readonly listMyAttendance: ListMyAttendanceUseCase,
    private readonly getCheckedInToday: GetCheckedInTodayUseCase,
    private readonly getMyDailyRecordsUseCase: GetMyDailyRecordsUseCase,
    private readonly getTodayAttendanceUseCase: GetTodayAttendanceUseCase,
    private readonly getEmployeesPresence: GetEmployeesPresenceUseCase,
    private readonly queryScopeService: QueryScopeService,
  ) {}

  @Get()
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "List attendances with optional date range filter" })
  @ApiOkResponse({ type: AttendanceListEnvelopeDto })
  async findAll(
    @Query() query: AttendanceQueryDto,
    @Request() req: ExpressRequest & { user: AuthUser },
  ) {
    const scope = this.queryScopeService.resolveScope(req.user, "attendance");
    return this.listAttendances.execute(query, scope);
  }

  @Get("me")
  @RequirePermission(Permissions.ATTENDANCE_VIEW_SELF)
  @ApiOperation({ summary: "Get current user's attendance history" })
  @ApiOkResponse({ type: AttendanceListEnvelopeDto })
  async getMyAttendance(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Query() query: AttendanceQueryDto,
  ) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return { data: [], pagination: { page: query.page ?? 1, limit: query.limit ?? 20, total: 0 } };
    }
    return this.listMyAttendance.execute(employeeId, query);
  }

  @Get("checked-in-today")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "List employees checked in today" })
  @ApiOkResponse({ type: AttendanceListEnvelopeDto })
  async checkedInToday(@Query("date") date?: string) {
    return this.getCheckedInToday.execute(date);
  }

  @Get("presence")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "List current employee working presence status" })
  @ApiOkResponse({ type: PresenceListResponseDto })
  async getPresence(@Query() query: PresenceQueryDto) {
    return this.getEmployeesPresence.execute(query);
  }

  @Get("presence/summary")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "Get count summary of employee presence states" })
  @ApiOkResponse({ type: PresenceSummaryResponseDto })
  async getPresenceSummary(@Query() query: PresenceQueryDto) {
    return this.getEmployeesPresence.getSummary(query);
  }

  @Get("history")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "Get my daily records" })
  @ApiOkResponse({ description: "Daily records retrieved" })
  async getMyDailyRecords(
    @Request() req: ExpressRequest & { user: AuthUser },
  ) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return { date: new Date().toISOString().slice(0, 10), attendances: [], exceptions: [] };
    }
    return this.getMyDailyRecordsUseCase.execute(employeeId);
  }

  @Get("today")
  @RequirePermission(Permissions.ATTENDANCE_VIEW_SELF)
  @ApiOperation({ summary: "Get current user's today attendance status" })
  @ApiOkResponse({ type: TodayAttendanceEnvelopeDto })
  async getTodayAttendance(
    @Request() req: ExpressRequest & { user: AuthUser },
  ) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        date: today,
        todaySessions: [],
        shift: null,
        geofence: null,
        canCheckIn: false,
        canCheckOut: false,
        warnings: [],
      };
    }
    return this.getTodayAttendanceUseCase.execute(employeeId);
  }
}
