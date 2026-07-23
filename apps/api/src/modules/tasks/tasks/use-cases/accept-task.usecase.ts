import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { WorkflowEngine } from "../../../platform-workflow-engine/tasks/workflow-engine";
import { TasksRepository } from "../repositories/tasks.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class AcceptTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, AcceptTaskUseCase.name);
  }

  async execute(id: string, actor: AuthUser) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId: id });
    }

    const result = await this.workflowEngine.execute({
      taskId: id,
      actor,
      transition: "accept",
    });
    return result.task;
  }
}



