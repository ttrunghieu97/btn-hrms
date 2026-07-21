import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TaskEventPublisher } from "../task-event-publisher";

@Injectable()
export class OutboxDispatcherConsumer {
  private readonly logger = new Logger(OutboxDispatcherConsumer.name);

  constructor(private readonly eventPublisher: TaskEventPublisher) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async dispatchUnprocessedEvents() {
    const dispatched = await this.eventPublisher.dispatchUnprocessed(100);
    if (dispatched > 0) {
      this.logger.log(`Dispatched ${dispatched} unprocessed task event(s)`);
    }
  }
}
