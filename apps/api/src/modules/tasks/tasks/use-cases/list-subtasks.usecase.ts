import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskMapper } from "../mappers/task.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListSubtasksUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListSubtasksUseCase.name);
  }

  async execute(parentTaskId: string) {
    const rows = await this.tasksRepo.findSubtasks(parentTaskId);
    return { data: TaskMapper.toResponseDtos(rows as any) };
  }
}
