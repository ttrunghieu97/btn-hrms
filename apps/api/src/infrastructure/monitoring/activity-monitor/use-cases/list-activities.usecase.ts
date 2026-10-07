import { Injectable } from "@nestjs/common";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ActivityRepository } from "../repositories/activity.repository";
import { ActivityMapper } from "../mappers/activity.mapper";
import type { ActivityQueryDto } from "../dto/activity-query.dto";

@Injectable()
export class ListActivitiesUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListActivitiesUseCase.name);
  }

  async execute(query: ActivityQueryDto) {
    const result = await this.activityRepo.findMany(query);
    const data = ActivityMapper.toResponseDtos(result.rows);

    return {
      data,
      meta: {
        requestId: this.requestContext.get()?.requestId ?? "unknown",
        timestamp: new Date().toISOString(),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasNext: result.page * result.limit < result.total,
        },
      },
      error: null,
    };
  }
}
