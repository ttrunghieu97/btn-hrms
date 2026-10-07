import { type Logger } from "@nestjs/common";
import { type MetricsService } from "../../../../shared/metrics/metrics.service";
import { type ConsumerIdempotencyRepository } from "../repositories/consumer-idempotency.repository";
import { TASK_EVENTS_TOPIC, type TaskDomainEvent } from "../task-domain-events";

export abstract class IdempotentConsumer {
  protected abstract logger: Logger;
  protected abstract consumerId: string;
  protected abstract idempotencyRepo: ConsumerIdempotencyRepository;
  protected abstract metrics: MetricsService;

  protected async processIdempotently(
    event: TaskDomainEvent,
    handler: (tx: any) => Promise<void>,
  ): Promise<void> {
    try {
      await this.idempotencyRepo.transaction(async (tx) => {
        await this.idempotencyRepo.insert(this.consumerId, event.eventId, tx);
        await handler(tx);
      });

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
    } catch (error: any) {
      if (error.code === "23505") {
        // Postgres Unique Violation
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
      this.logger.error(
        `Failed to process event ${event.eventId} in consumer ${this.consumerId}`,
        error,
      );
      this.metrics.incrementConsumerProcessingError(this.consumerId);
      throw error; // Re-throw so Kafka doesn't commit the offset
    }
  }
}


