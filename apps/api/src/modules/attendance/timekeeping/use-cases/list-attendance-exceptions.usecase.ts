import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { AttendanceExceptionQueryDto } from "../dto/attendance-exception-query.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { QueryScopeService } from "../../../../core/security/query-scope.service";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ListAttendanceExceptionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly requestContext: RequestContextService,
    private readonly queryScope?: QueryScopeService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListAttendanceExceptionsUseCase.name);
  }

  async execute(query: AttendanceExceptionQueryDto, user?: AuthUser) {
    const scopedQuery = { ...query };
    if (user && this.queryScope) {
      const scope = this.queryScope.resolveScope(user, "attendance");
      if (scope.tier === "self") {
        scopedQuery.employeeId = scope.employeeId;
      } else if (scope.tier === "department") {
        scopedQuery.departmentId = scope.departmentId;
      }
    }
    const { rows, total, page, limit } = await this.repo.listExceptions(scopedQuery);
    return buildPaginatedResponse(rows, total, page, limit);
  }
}



