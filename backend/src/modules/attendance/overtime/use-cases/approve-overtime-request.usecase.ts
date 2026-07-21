import { Injectable } from "@nestjs/common";
import { OvertimeMapper } from "../mappers/overtime.mapper";
import { ApproveOvertimeDto } from "../dto/overtime.dto";
import { OvertimeWorkflowService } from "../services/overtime-workflow.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ApproveOvertimeRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflow: OvertimeWorkflowService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ApproveOvertimeRequestUseCase.name);
  }

  async execute(id: string, actorUserId: string, dto: ApproveOvertimeDto) {
    const result = await this.workflow.approveRequest(
      id,
      actorUserId,
      dto.approvedMinutes,
    );
    return OvertimeMapper.toDto(result);
  }
}



