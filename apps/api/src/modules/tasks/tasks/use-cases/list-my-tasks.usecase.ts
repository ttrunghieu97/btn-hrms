import { Injectable } from "@nestjs/common";
import { TaskQueryDto } from "../dto/task-query.dto";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { ListTasksUseCase } from "./list-tasks.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListMyTasksUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly listTasks: ListTasksUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListMyTasksUseCase.name);
  }

  async execute(query: TaskQueryDto, employeeId?: string | null) {
    if (!employeeId) {
      return buildPaginatedResponse([], 0, query.page ?? 1, query.limit ?? 20);
    }

    return this.listTasks.execute({ ...query, assigneeId: employeeId });
  }
}
