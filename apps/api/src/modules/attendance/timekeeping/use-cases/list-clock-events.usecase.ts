import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AttendanceClockEventQueryDto } from "../dto/attendance-clock-event-query.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ListClockEventsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
    private readonly queryScope?: QueryScopeService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListClockEventsUseCase.name);
  }

  async execute(query: AttendanceClockEventQueryDto, user?: AuthUser) {
    const scope =
      user && this.queryScope
        ? this.queryScope.resolveScope(user, "attendance")
        : undefined;
    const { rows, total, page, limit } = await this.repo.listClockEvents(query, scope);
    return buildPaginatedResponse(rows, total, page, limit);
  }
}



