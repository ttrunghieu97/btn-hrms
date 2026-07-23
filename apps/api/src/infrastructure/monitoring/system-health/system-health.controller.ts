import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { GetSystemHealthUseCase } from "./use-cases/get-system-health.usecase";
import { SystemHealthEnvelopeDto } from "./dto/system-health-response.dto";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { RequestContextService } from "../../../shared/context/request-context.service";

@ApiTags("System Health")
@ApiBearerAuth()
@Controller()
export class SystemHealthController {
  constructor(
    private readonly getSystemHealth: GetSystemHealthUseCase,
    @Inject(RequestContextService) private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  @RequirePermission(Permissions.MONITORING_VIEW)
  @ApiOperation({ summary: "Get system health status for all components" })
  @ApiOkResponse({ type: SystemHealthEnvelopeDto })
  async getHealth() {
    const data = await this.getSystemHealth.execute();
    return {
      data,
      meta: { requestId: this.requestContext.get()?.requestId ?? "", timestamp: data.checkedAt },
      error: null,
    };
  }
}
