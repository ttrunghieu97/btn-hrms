/**
 * activity-log.consumer.ts
 * Projects task domain events into the audit_logs table.
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
import { TaskAuditLogRepository } from "../repositories/task-audit-log.repository";

@Injectable()
export class ActivityLogConsumer
  extends IdempotentConsumer
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(ActivityLogConsumer.name);
  protected readonly consumerId = "task-activity-log-consumer";
  private consumer: Consumer | null = null;

  constructor(
    protected readonly idempotencyRepo: ConsumerIdempotencyRepository,
    private readonly auditLogRepo: TaskAuditLogRepository,
    protected readonly metrics: MetricsService,
    @Optional() @InjectKafka() private readonly kafka: Kafka | null,
  ) {
    super();
  }

  async onModuleInit() {
    if (!this.kafka) {
      this.logger.warn("Kafka unavailable — ActivityLogConsumer disabled");
      return;
    }

    const consumer = this.kafka.consumer({
      groupId: "task-activity-log-consumer",
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
      this.logger.log("ActivityLogConsumer started");
    } catch (err) {
      await consumer.disconnect().catch(() => undefined);
      this.consumer = null;
      this.logger.warn(
        "Kafka startup failed — ActivityLogConsumer disabled",
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

    await this.processIdempotently(event, async (tx) => {
      await this.auditLogRepo.insertTaskEventProjection(
        {
          actorUserId: event.actorUserId ?? null,
          action: event.eventType,
          aggregateId: event.aggregateId,
          payload: event.payload,
        },
        tx,
      );
    });
  }
}
