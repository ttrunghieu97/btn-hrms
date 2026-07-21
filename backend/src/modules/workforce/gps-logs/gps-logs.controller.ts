import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CreateGPSLogDto } from "./dto/create-gps-log.dto";
import { GPSLogQueryDto } from "./dto/gps-log-query.dto";
import { ListGPSLogsUseCase } from "./use-cases/list-gps-logs.usecase";
import { CreateGPSLogForCurrentUserUseCase } from "./use-cases/create-gps-log-for-current-user.usecase";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("GPS Logs")
@ApiBearerAuth()
@Controller("workforce/gps")
export class GPSLogsController {
  constructor(
    private readonly createGPSLogForCurrentUser: CreateGPSLogForCurrentUserUseCase,
    private readonly listGPSLogs: ListGPSLogsUseCase,
  ) {}

  @Get()
  @RequirePermission(Permissions.GPS_LOGS_VIEW)
  @ApiOperation({ summary: "Get GPS history (for managers)" })
  findAll(@Query() query: GPSLogQueryDto) {
    return this.listGPSLogs.execute(query);
  }

  @Post()
  @RequirePermission(Permissions.GPS_LOGS_SUBMIT)
  @AuditLog({ action: "gps_log_submit", entity: "gps_log" })
  @ApiOperation({ summary: "Submit GPS coordinates (for field workers)" })
  async create(@Request() req: { user: AuthUser }, @Body() dto: CreateGPSLogDto) {
    return this.createGPSLogForCurrentUser.execute(req.user.id, dto);
  }
}

