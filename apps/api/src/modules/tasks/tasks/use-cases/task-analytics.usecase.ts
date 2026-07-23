import { Injectable } from "@nestjs/common";
import { TaskAnalyticsRepository } from "../repositories/task-analytics.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class TaskAnalyticsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: TaskAnalyticsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, TaskAnalyticsUseCase.name);
  }

  async execute(filters: {
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { whereClause, eventEndDate } = this.repo.buildTaskWhere(filters) as {
      whereClause: any;
      eventEndDate?: Date;
    };

    const [statusCounts, priorityCounts, overdueRows, slaRows] =
      await Promise.all([
        this.repo.statusDistribution(whereClause, filters.departmentId),
        this.repo.priorityDistribution(whereClause, filters.departmentId),
        this.repo.overdueCount(whereClause, filters.departmentId),
        this.repo.slaBreachCount({
          departmentId: filters.departmentId,
          startDate: filters.startDate,
          eventEndDate,
        }),
      ]);

    const overdueCount = Number((overdueRows as any)?.[0]?.count ?? 0);
    const slaBreachCount = Number((slaRows as any)?.[0]?.count ?? 0);

    const totalCount = statusCounts.reduce(
      (acc: number, curr: any) => acc + Number(curr.count ?? 0),
      0,
    );
    const completedCount =
      statusCounts.find((s: any) => s.status === "completed")?.count ?? 0;

    return {
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      overdueCount,
      slaBreachCount,
      totalCount,
      completionRate:
        totalCount > 0 ? (Number(completedCount) / totalCount) * 100 : 0,
    };
  }
}



