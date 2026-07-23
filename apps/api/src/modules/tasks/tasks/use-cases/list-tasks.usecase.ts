import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskQueryDto } from "../dto/task-query.dto";
import { TaskMapper } from "../mappers/task.mapper";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTasksUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTasksUseCase.name);
  }

  async execute(query: TaskQueryDto) {
    const { rows, total, page, limit } = await this.tasksRepo.list(query);
    return buildPaginatedResponse(
      TaskMapper.toResponseDtos(rows as any),
      total,
      page,
      limit,
    );
  }
}


