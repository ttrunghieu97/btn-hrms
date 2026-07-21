import { Injectable } from "@nestjs/common";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListEmployeeLeaveBalancesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListEmployeeLeaveBalancesUseCase.name);
  }

  async execute(employeeId: string) {
    const rows =
      await this.leaveRequestsRepo.listBalancesByEmployee(employeeId);
    return LeaveRequestMapper.toBalanceDtos(rows);
  }
}



