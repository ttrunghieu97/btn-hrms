import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TaskEventsService } from "../realtime/task-events.service";
import { TaskMapper } from "../mappers/task.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly taskEvents: TaskEventsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteTaskUseCase.name);
  }

  async execute(id: string) {
    const existing = await this.tasksRepo.findById(id);
    const deleted = await this.tasksRepo.deleteById(id);
    if (!deleted) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, {
        taskId: id,
      });
    }

    this.taskEvents.publishTaskEvent({
      action: "task_deleted",
      taskId: id,
      task: existing ? TaskMapper.toResponseDto(existing) : undefined,
      assigneeEmployeeId: (existing)?.assigneeId ?? null,
      actorUserId: null,
    });

    return { ok: true };
  }
}
