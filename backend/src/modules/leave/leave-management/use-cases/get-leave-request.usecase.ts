import { Injectable } from "@nestjs/common";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetLeaveRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetLeaveRequestUseCase.name);
  }

  async execute(id: string) {
    const row = await this.leaveRequestsRepo.findById(id);
    if (!row) {
      throwNotFound("Leave request not found", ERROR_CODES.INVALID_REQUEST, {
        leaveRequestId: id,
      });
    }
    return LeaveRequestMapper.toResponseDto(row);
  }
}



