import { Injectable } from "@nestjs/common";
import { TaskActivityMapper } from "../mappers/task-activity.mapper";
import { TaskActivitiesRepository } from "../repositories/task-activities.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskActivitiesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: TaskActivitiesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskActivitiesUseCase.name);
  }

  async execute(taskId: string) {
    const rows = await this.repo.listByTaskId(taskId);
    return { data: TaskActivityMapper.toResponseDtos(rows as any) };
  }
}


