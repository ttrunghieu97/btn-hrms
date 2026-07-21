import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AuditLogQueryDto } from "../dto/audit-log-query.dto";
import { AuditLogMapper } from "../mappers/audit-log.mapper";
import { AuditLogsRepository } from "../repositories/audit-logs.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListAuditLogsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly auditLogsRepo: AuditLogsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListAuditLogsUseCase.name);
  }

  async execute(query: AuditLogQueryDto) {
    const limit = query.limit ?? 100;
    const offset =
      typeof query.offset === "number"
        ? query.offset
        : ((query.page ?? 1) - 1) * limit;
    const page =
      typeof query.offset === "number"
        ? Math.floor(offset / limit) + 1
        : (query.page ?? 1);

    const where = this.auditLogsRepo.buildWhere({
      actorUserId: query.actorUserId,
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      search: query.getNormalizedSearch(),
    });

    const rows = await this.auditLogsRepo.findMany({ limit, offset, where });
    const total = await this.auditLogsRepo.countAll(where);

    return buildPaginatedResponse(
      AuditLogMapper.toResponseDtos(rows as any /* eslint-disable-line @typescript-eslint/no-explicit-any */),
      total,
      page,
      limit,
    );
  }
}




