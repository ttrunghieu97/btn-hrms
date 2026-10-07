import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MetricsService } from "../../../shared/metrics/metrics.service";
import { TaskEventsMetricsRepository } from "./repositories/task-events-metrics.repository";

@Injectable()
export class OutboxMetricsService {
  private readonly logger = new Logger(OutboxMetricsService.name);

  constructor(
    private readonly metrics: MetricsService,
    private readonly taskEventsMetricsRepo: TaskEventsMetricsRepository,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorOutboxQueueDepth() {
    try {
      const count = await this.taskEventsMetricsRepo.countUnprocessed();
      this.metrics.setOutboxPendingCount(count);
    } catch (err) {
      this.logger.error("Failed to query outbox queue depth", err);
    }
  }
}
