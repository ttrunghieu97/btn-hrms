import { Injectable, NotFoundException } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskMapper } from "../mappers/task.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class FindTaskByIdUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, FindTaskByIdUseCase.name);
  }

  async execute(id: string) {
    const task = await this.tasksRepo.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return { data: TaskMapper.toResponseDto(task) };
  }
}
