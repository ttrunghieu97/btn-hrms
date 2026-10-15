import { Injectable, Optional } from "@nestjs/common";
import { LeaveRequestQueryDto } from "../dto/leave-request-query.dto";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { LeaveAuthorizationService } from "../services/leave-authorization.service";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class ListLeaveRequestsUseCase {
  private readonly logger: ContextLogger;
  private readonly leaveAuth: LeaveAuthorizationService;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly requestContext: RequestContextService,
    @Optional() leaveAuthorization?: LeaveAuthorizationService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListLeaveRequestsUseCase.name);
    this.leaveAuth = leaveAuthorization ?? new LeaveAuthorizationService();
  }

  async execute(query: LeaveRequestQueryDto, actor?: AuthUser) {
    const scope = actor ? this.leaveAuth.resolveViewScope(actor) : undefined;
    const scopedQuery: LeaveRequestQueryDto =
      scope?.tier === "self" && scope.employeeId
        ? { ...query, employeeId: scope.employeeId }
        : query;

    const result = await this.leaveRequestsRepo.list(scopedQuery, scope);
    return {
      ...result,
      rows: LeaveRequestMapper.toResponseDtos(result.rows),
    };
  }
}
