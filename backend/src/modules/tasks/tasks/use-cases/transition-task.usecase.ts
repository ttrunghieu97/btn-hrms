import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { WorkflowEngine } from "../../../platform-workflow-engine/tasks/workflow-engine";
import { TransitionTaskDto } from "../dto/transition-task.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class TransitionTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, TransitionTaskUseCase.name);
  }

  async execute(id: string, dto: TransitionTaskDto, actor: AuthUser) {
    if (dto.transition === "assign" && !dto.assigneeId) {
      throwBadRequest(
        "Assign transition requires assigneeId",
        ERROR_CODES.INVALID_REQUEST,
        { taskId: id },
      );
    }

    return this.workflowEngine.execute({
      taskId: id,
      actor,
      transition: dto.transition,
      data: {
        reason: dto.reason,
        resultText: dto.resultText,
        checklist: dto.checklist,
        assigneeId: dto.assigneeId,
        correlationId: dto.correlationId,
      },
    });
  }
}




