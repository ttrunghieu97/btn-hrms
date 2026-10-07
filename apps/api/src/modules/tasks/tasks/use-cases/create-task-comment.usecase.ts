import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { CreateTaskCommentDto } from "../dto/create-task-comment.dto";
import { TaskCommentMapper } from "../mappers/task-comment.mapper";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { TaskEventsService } from "../realtime/task-events.service";
import { TaskMapper } from "../mappers/task.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateTaskCommentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly taskEvents: TaskEventsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateTaskCommentUseCase.name);
  }

  async execute(taskId: string, dto: CreateTaskCommentDto, actor: AuthUser) {
    const existing = await this.tasksRepo.findById(taskId);
    if (!existing) {
      throwNotFound("Task not found", ERROR_CODES.TASK_NOT_FOUND, { taskId });
    }

    const row = await this.tasksRepo.addComment({
      taskId,
      authorUserId: actor?.id ?? null,
      content: dto.content,
    });

    const response = TaskCommentMapper.toResponseDto(row as any);

    this.taskEvents.publishTaskEvent({
      action: "task_updated",
      taskId,
      task: TaskMapper.toResponseDto(existing),
      assigneeEmployeeId: (existing)?.assigneeId ?? null,
      actorUserId: actor?.id ?? null,
    });

    return response;
  }
}




