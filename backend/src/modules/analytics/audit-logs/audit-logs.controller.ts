import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AuditLogPolicies } from "../../../core/security/policies/audit-log.policy";
import { ListAuditLogsUseCase } from "./use-cases/list-audit-logs.usecase";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@Controller()
export class AuditLogsController {
  constructor(private readonly listAuditLogs: ListAuditLogsUseCase) {}

  @Get()
  @CheckPolicy(AuditLogPolicies.view)
  @ApiOperation({ summary: "Get system audit logs" })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.listAuditLogs.execute(query);
  }
}



