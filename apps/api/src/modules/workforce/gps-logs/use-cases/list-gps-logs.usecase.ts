import { Injectable } from "@nestjs/common";
import { GPSLogQueryDto } from "../dto/gps-log-query.dto";
import { GPSLogMapper } from "../mappers/gps-log.mapper";
import { GPSLogsRepository } from "../repositories/gps-logs.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ListGPSLogsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly gpsLogsRepo: GPSLogsRepository,
    private readonly requestContext: RequestContextService,
    private readonly queryScope?: QueryScopeService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListGPSLogsUseCase.name);
  }

  async execute(query: GPSLogQueryDto, user?: AuthUser) {
    const scope =
      user && this.queryScope
        ? this.queryScope.resolveScope(user, "attendance")
        : undefined;
    const list = await this.gpsLogsRepo.findMany(query, scope);
    return GPSLogMapper.toResponseDtos(list);
  }
}

