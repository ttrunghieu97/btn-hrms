import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskAssignmentMapper } from "../mappers/task-assignment.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskAssignmentsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskAssignmentsUseCase.name);
  }

  async execute(taskId: string) {
    const rows = await this.tasksRepo.listAssignments(taskId);
    return {
      data: TaskAssignmentMapper.toResponseDtos(rows as any),
    };
  }
}


