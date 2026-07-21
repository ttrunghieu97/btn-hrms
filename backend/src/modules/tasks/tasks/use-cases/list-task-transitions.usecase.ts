import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { TransitionValidator } from "../../../platform-workflow-engine/tasks/transition-validator";
import { TasksRepository } from "../repositories/tasks.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskTransitionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly transitionValidator: TransitionValidator,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskTransitionsUseCase.name);
  }

  async execute(id: string, actor: AuthUser) {
    const task = await this.tasksRepo.findById(id);
    if (!task) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, {
        taskId: id,
      });
    }

    return this.transitionValidator.getAllowedTransitions(
      {
        id: task.id,
        status: task.status,
        assigneeId: task.assigneeId ?? null,
        createdByUserId: (task).createdByUserId ?? null,
        assignee: (task).assignee ?? null,
      },
      actor,
    );
  }
}



