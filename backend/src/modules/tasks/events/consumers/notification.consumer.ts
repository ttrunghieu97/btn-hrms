/**
 * notification.consumer.ts
 * Kafka consumer for dispatching notifications from task domain events.
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import type { Consumer, EachMessagePayload, Kafka } from "kafkajs";
import { InjectKafka } from "../kafka/kafka.decorators";
import { TASK_EVENTS_TOPIC, type TaskDomainEvent } from "../task-domain-events";
import { IdempotentConsumer } from "./idempotent-consumer";
import { MetricsService } from "../../../../shared/metrics/metrics.service";
import { ConsumerIdempotencyRepository } from "../repositories/consumer-idempotency.repository";

@Injectable()
export class NotificationConsumer
  extends IdempotentConsumer
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(NotificationConsumer.name);
  protected readonly consumerId = "task-notification-consumer";
  private consumer: Consumer | null = null;

  constructor(
    protected readonly idempotencyRepo: ConsumerIdempotencyRepository,
    protected readonly metrics: MetricsService,
    @Optional() @InjectKafka() private readonly kafka: Kafka | null,
  ) {
    super();
  }

  async onModuleInit() {
    if (!this.kafka) {
      this.logger.warn("Kafka unavailable — NotificationConsumer disabled");
      return;
    }

    const consumer = this.kafka.consumer({
      groupId: "task-notification-consumer",
    });

    try {
      await consumer.connect();
      await consumer.subscribe({
        topic: TASK_EVENTS_TOPIC,
        fromBeginning: false,
      });
      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) =>
          this.handleMessage(payload),
      });
      this.consumer = consumer;
      this.logger.log("NotificationConsumer started");
    } catch (err) {
      await consumer.disconnect().catch(() => undefined);
      this.consumer = null;
      this.logger.warn(
        "Kafka startup failed — NotificationConsumer disabled",
        err,
      );
    }
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect().catch(() => undefined);
  }

  private async handleMessage(payload: EachMessagePayload) {
    const raw = payload.message.value?.toString();
    if (!raw) return;

    let event: TaskDomainEvent;
    try {
      event = JSON.parse(raw) as TaskDomainEvent;
    } catch {
      return;
    }

    await this.processIdempotently(event, async () => {
      await this.dispatch(event);
    });
  }

  private async dispatch(event: TaskDomainEvent): Promise<void> {
    switch (event.eventType) {
      case "task.assigned":
      case "task.unassigned":
      case "task.declined":
      case "task.submitted":
      case "task.completed":
      case "task.cancelled":
      case "task.revision_requested":
      case "task.overdue":
      case "task.due_soon":
      case "task.approval_overdue":
      case "task.revision_limit_reached":
        this.logger.debug(
          `[Notification] ${event.eventType} → ${event.aggregateId}`,
        );
        // Extend here: call email/push/Slack integrations
        break;
      default:
        break;
    }
  }
}
