import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiQuery } from "@nestjs/swagger";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { DashboardService } from "./application/dashboard.service";
import { GetAttendanceStatsUseCase } from "./use-cases/get-attendance-stats.usecase";
import type { DashboardContext } from "./application/interfaces/dashboard-context.interface";
import { DashboardResponseEnvelopeDto } from "./dto/dashboard-widget.dto";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly getAttendanceStatsUseCase: GetAttendanceStatsUseCase,
  ) {}

  @Get()
  @RequirePermission(Permissions.DASHBOARD_VIEW)
  @ApiOperation({ summary: "Get dashboard widgets for the current user" })
  @ApiOkResponse({ type: DashboardResponseEnvelopeDto })
  async getDashboard(
    @Req() req: { user: AuthUser },
  ): Promise<DashboardResponseEnvelopeDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const ctx: DashboardContext = {
      companyId: "default",
      dateRange: { start: thirtyDaysAgo, end: now },
      currentUserId: req.user.id,
      currentUserPermissions: req.user.permissions,
      currentUserRoles: req.user.roles,
      timezone: "Asia/Ho_Chi_Minh",
      locale: "vi-VN",
    };

    return this.dashboardService.getWidgets(ctx);
  }

  @Get("attendance-stats")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "Get attendance analytics statistics" })
  @ApiQuery({ name: "month", required: false })
  async getAttendanceStats(@Query("month") month?: string) {
    return this.getAttendanceStatsUseCase.execute(month);
  }
}
