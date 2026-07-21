import { type Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { type MetricsService } from "../../../../shared/metrics/metrics.service";
import { TASK_EVENTS_TOPIC, type TaskDomainEvent } from "../task-domain-events";

export abstract class RedisIdempotentConsumer {
  protected abstract logger: Logger;
  protected abstract consumerId: string;
  protected abstract redis: Redis;
  protected abstract metrics: MetricsService;

  protected async processIdempotently(
    event: TaskDomainEvent,
    handler: (pipeline: any) => Promise<void>,
  ): Promise<void> {
    const key = `hrms:idempotency:${this.consumerId}:${event.eventId}`;

    // Try to set the key if it doesn't exist. EX sets expiry (e.g. 7 days = 604800s)
    // Using NX ensures we only process if the key wasn't already there.
    const acquired = await this.redis.set(key, "1", "EX", 604800, "NX");

    if (!acquired) {
      this.logger.debug(
        `Skipping event ${event.eventId} in consumer ${this.consumerId} — already processed.`,
      );
      this.metrics.incrementKafkaEventsConsumed(
        this.consumerId,
        TASK_EVENTS_TOPIC,
        event.eventType,
        "skipped_idempotent",
      );
      return; // Safe to acknowledge Kafka message
    }

    try {
      const pipeline = this.redis.pipeline();
      await handler(pipeline);
      await pipeline.exec();

      this.metrics.incrementKafkaEventsConsumed(
        this.consumerId,
        TASK_EVENTS_TOPIC,
        event.eventType,
        "success",
      );
      const lagMs = Date.now() - new Date(event.occurredAt).getTime();
      this.metrics.observeEventProcessingLag(
        this.consumerId,
        TASK_EVENTS_TOPIC,
        event.eventType,
        lagMs,
      );
    } catch (error) {
      // If the business logic fails, delete the idempotency key so we can retry
      await this.redis.del(key);
      this.logger.error(
        `Failed to process event ${event.eventId} in consumer ${this.consumerId}`,
        error,
      );
      this.metrics.incrementConsumerProcessingError(this.consumerId);
      throw error;
    }
  }
}


