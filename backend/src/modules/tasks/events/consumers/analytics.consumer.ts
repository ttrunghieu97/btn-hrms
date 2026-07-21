/**
 * analytics.consumer.ts
 * Projects task domain events into Redis KPI counters.
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import type { Consumer, EachMessagePayload, Kafka } from "kafkajs";
import Redis from "ioredis";
import { InjectKafka } from "../kafka/kafka.decorators";
import { TASK_EVENTS_TOPIC, type TaskDomainEvent } from "../task-domain-events";
import { MetricsService } from "../../../../shared/metrics/metrics.service";

import { RedisIdempotentConsumer } from "./redis-idempotent-consumer";

const KPI_PREFIX = "hrms:kpi:tasks";

@Injectable()
export class AnalyticsConsumer
  extends RedisIdempotentConsumer
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(AnalyticsConsumer.name);
  protected readonly consumerId = "task-analytics-consumer";
  private consumer: Consumer | null = null;
  protected redis!: Redis;

  constructor(
    @Optional() @InjectKafka() private readonly kafka: Kafka | null,
    protected readonly metrics: MetricsService,
  ) {
    super();
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
    }
  }

  async onModuleInit() {
    if (!this.kafka) {
      this.logger.warn("Kafka unavailable — AnalyticsConsumer disabled");
      return;
    }

    const consumer = this.kafka.consumer({ groupId: "task-analytics-consumer" });

    try {
      await consumer.connect();
      await consumer.subscribe({
        topic: TASK_EVENTS_TOPIC,
        fromBeginning: false,
      });
      await consumer.run({
        eachMessage: async (p: EachMessagePayload) => this.handleMessage(p),
      });
      this.consumer = consumer;
      this.logger.log("AnalyticsConsumer started");
    } catch (err) {
      await consumer.disconnect().catch(() => undefined);
      this.consumer = null;
      this.logger.warn(
        "Kafka startup failed — AnalyticsConsumer disabled",
        err,
      );
    }
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect().catch(() => undefined);
    this.redis?.disconnect();
  }

  private async handleMessage(payload: EachMessagePayload) {
    const raw = payload.message.value?.toString();
    if (!raw || !this.redis) return;

    let event: TaskDomainEvent;
    try {
      event = JSON.parse(raw) as TaskDomainEvent;
    } catch {
      return;
    }

    await this.processIdempotently(event, async (pipeline) => {
      switch (event.eventType) {
        case "task.created":
          pipeline.incr(`${KPI_PREFIX}:created_total`);
          pipeline.incr(`${KPI_PREFIX}:by_status:created`);
          break;
        case "task.assigned":
          pipeline.decr(`${KPI_PREFIX}:by_status:created`);
          pipeline.incr(`${KPI_PREFIX}:by_status:assigned`);
          break;
        case "task.unassigned":
          pipeline.decr(`${KPI_PREFIX}:by_status:assigned`);
          pipeline.incr(`${KPI_PREFIX}:by_status:created`);
          break;
        case "task.accepted":
          pipeline.decr(`${KPI_PREFIX}:by_status:assigned`);
          pipeline.incr(`${KPI_PREFIX}:by_status:in_progress`);
          break;
        case "task.declined":
          pipeline.decr(`${KPI_PREFIX}:by_status:assigned`);
          pipeline.incr(`${KPI_PREFIX}:by_status:declined`);
          pipeline.incr(`${KPI_PREFIX}:declined_total`);
          break;
        case "task.submitted":
          pipeline.decr(`${KPI_PREFIX}:by_status:in_progress`);
          pipeline.incr(`${KPI_PREFIX}:by_status:submitted`);
          break;
        case "task.revision_requested":
          pipeline.decr(`${KPI_PREFIX}:by_status:submitted`);
          pipeline.incr(`${KPI_PREFIX}:by_status:revision`);
          pipeline.incr(`${KPI_PREFIX}:revisions_total`);
          break;
        case "task.completed": {
          pipeline.incr(`${KPI_PREFIX}:completed_total`);
          pipeline.decr(`${KPI_PREFIX}:by_status:submitted`);
          pipeline.incr(`${KPI_PREFIX}:by_status:completed`);
          const p = event.payload as any;
          if (p?.task?.startedAt && p?.task?.completedAt) {
            const duration =
              new Date(p.task.completedAt).getTime() -
              new Date(p.task.startedAt).getTime();
            if (duration > 0) {
              pipeline.lpush(`${KPI_PREFIX}:completion_times`, duration);
              pipeline.ltrim(`${KPI_PREFIX}:completion_times`, 0, 999);
            }
          }
          break;
        }
        case "task.cancelled":
          pipeline.incr(`${KPI_PREFIX}:cancelled_total`);
          pipeline.incr(`${KPI_PREFIX}:by_status:cancelled`);
          break;
        case "task.overdue":
          pipeline.incr(`${KPI_PREFIX}:overdue_total`);
          break;
        case "task.approval_overdue":
          pipeline.incr(`${KPI_PREFIX}:approval_overdue_total`);
          break;
        case "task.revision_limit_reached":
          pipeline.incr(`${KPI_PREFIX}:revision_limit_reached_total`);
          break;
      }
    });
  }
}


