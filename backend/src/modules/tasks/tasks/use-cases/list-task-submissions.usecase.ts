import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../repositories/tasks.repository";
import { TaskSubmissionMapper } from "../mappers/task-submission.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskSubmissionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskSubmissionsUseCase.name);
  }

  async execute(taskId: string) {
    const rows = await this.tasksRepo.listSubmissions(taskId);
    return { data: TaskSubmissionMapper.toResponseDtos(rows as any) };
  }
}


