import { Injectable } from "@nestjs/common";
import { OvertimeMapper } from "../mappers/overtime.mapper";
import { RejectOvertimeDto } from "../dto/overtime.dto";
import { OvertimeWorkflowService } from "../services/overtime-workflow.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RejectOvertimeRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflow: OvertimeWorkflowService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RejectOvertimeRequestUseCase.name);
  }

  async execute(id: string, actorUserId: string, dto: RejectOvertimeDto) {
    const result = await this.workflow.rejectRequest(id, actorUserId, dto.reason);
    return OvertimeMapper.toDto(result);
  }
}



