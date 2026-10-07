import { Injectable } from "@nestjs/common";
import { LeaveRequestQueryDto } from "../dto/leave-request-query.dto";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListLeaveRequestsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListLeaveRequestsUseCase.name);
  }

  async execute(query: LeaveRequestQueryDto) {
    const result = await this.leaveRequestsRepo.list(query);
    return {
      ...result,
      rows: LeaveRequestMapper.toResponseDtos(result.rows),
    };
  }
}



