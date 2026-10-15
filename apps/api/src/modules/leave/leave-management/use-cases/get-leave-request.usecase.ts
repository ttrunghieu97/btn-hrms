import { Injectable, Optional } from "@nestjs/common";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { LeaveAuthorizationService } from "../services/leave-authorization.service";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";

@Injectable()
export class GetLeaveRequestUseCase {
  private readonly logger: ContextLogger;
  private readonly leaveAuth: LeaveAuthorizationService;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly requestContext: RequestContextService,
    @Optional() leaveAuthorization?: LeaveAuthorizationService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetLeaveRequestUseCase.name);
    this.leaveAuth = leaveAuthorization ?? new LeaveAuthorizationService();
  }

  async execute(id: string, actor?: AuthUser) {
    const row = await this.leaveRequestsRepo.findById(id);
    if (!row) {
      throwNotFound("Leave request not found", ERROR_CODES.INVALID_REQUEST, {
        leaveRequestId: id,
      });
    }
    if (actor) {
      this.leaveAuth.assertCanViewRequest(actor, row);
    }
    return LeaveRequestMapper.toResponseDto(row);
  }
}
