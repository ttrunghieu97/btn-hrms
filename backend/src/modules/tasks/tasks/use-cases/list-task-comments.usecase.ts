import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskCommentMapper } from "../mappers/task-comment.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskCommentsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskCommentsUseCase.name);
  }

  async execute(taskId: string) {
    const rows = await this.tasksRepo.listComments(taskId);
    return { data: TaskCommentMapper.toResponseDtos(rows as any) };
  }
}


