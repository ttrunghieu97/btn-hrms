/**
 * task-event-publisher.ts
 * Publishes domain events to the event store and Kafka (when available).
 */

import { Injectable, Logger, Optional } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Kafka, Producer } from "kafkajs";
import { InjectKafka } from "./kafka/kafka.decorators";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { MetricsService } from "../../../shared/metrics/metrics.service";
import {
  TaskDomainEvent,
  TaskDomainEventType,
  TASK_EVENTS_TOPIC,
} from "./task-domain-events";
import { TaskEventStoreRepository } from "./task-event-store.repository";
import { assertCanonicalEventEnvelope } from "../../../core/events/canonical-event-envelope";

export interface PublishOptions {
  eventType: string;
  aggregateId: string;
  scopeId?: string | null;
  actorUserId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  payload: Record<string, any>;
}

@Injectable()
export class TaskEventPublisher {
  private readonly logger = new Logger(TaskEventPublisher.name);
  private producer: Producer | null = null;

  constructor(
    private readonly eventStore: TaskEventStoreRepository,
    private readonly requestContext: RequestContextService,
    private readonly metrics: MetricsService,
    @Optional() @InjectKafka() private readonly kafka: Kafka | null,
  ) {
    if (this.kafka) {
      this.producer = this.kafka.producer({ idempotent: true });
    }
  }

  async onModuleInit() {
    if (this.producer) {
      try {
        await this.producer.connect();
        this.logger.log("Kafka producer connected");
      } catch (err) {
        this.logger.warn(
          "Kafka producer connection failed — events will be stored only",
          err,
        );
        this.producer = null;
      }
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect().catch(() => undefined);
  }

  async publish(opts: PublishOptions): Promise<void> {
    const event = await this.enqueue(opts);
    await this.dispatchEvent(event);
  }

  async enqueue(opts: PublishOptions, db?: any): Promise<TaskDomainEvent> {
    const eventId = randomUUID();
    const occurredAt = new Date().toISOString();

    const event: TaskDomainEvent = {
      eventId,
      eventType: opts.eventType as TaskDomainEventType,
      eventVersion: 1,
      producerContext: "tasks",
      scopeId: opts.scopeId ?? this.requestContext.get()?.scopeId ?? null,
      aggregateId: opts.aggregateId,
      actorUserId: opts.actorUserId ?? null,
      correlationId:
        opts.correlationId ?? this.requestContext.get()?.requestId ?? null,
      causationId: opts.causationId ?? null,
      occurredAt,
      payload: opts.payload,
    };
    assertCanonicalEventEnvelope(event, "task_event_publisher");

    try {
      await this.eventStore.append(event, db);
    } catch (err) {
      this.logger.error(
        `Failed to persist event ${eventId} (${opts.eventType})`,
        err,
      );
      throw err;
    }

    return event;
  }

  async dispatchEvent(event: TaskDomainEvent): Promise<void> {
    if (!this.producer) return;

    try {
      await this.producer.send({
        topic: TASK_EVENTS_TOPIC,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              eventId: event.eventId,
              actorUserId: event.actorUserId ?? "",
            },
          },
        ],
      });

      await this.eventStore.markProcessed(event.eventId);

      this.metrics.incrementKafkaEventsPublished(TASK_EVENTS_TOPIC);
      const lagMs = Date.now() - new Date(event.occurredAt).getTime();
      this.metrics.observeEventDispatchLag(TASK_EVENTS_TOPIC, lagMs);
    } catch (err) {
      this.logger.warn(
        `Kafka publish failed for ${event.eventId} — event remains unprocessed`,
        err,
      );
      await this.eventStore
        .markUnprocessed(event.eventId)
        .catch(() => undefined);
    }
  }

  async dispatchUnprocessed(limit = 100): Promise<number> {
    if (!this.producer) return 0;

    // We execute the findUnprocessed in a transaction so that the FOR UPDATE SKIP LOCKED
    // locks the rows until we finish dispatching them or the transaction commits/rolls back.
    let dispatched = 0;
    await this.eventStore.transaction(async (tx) => {
      const rows = await this.eventStore.findUnprocessed(limit, tx);
      for (const row of rows) {
        const event: TaskDomainEvent = {
          eventId: row.id,
          eventType: row.eventType,
          eventVersion: 1,
          producerContext: "tasks",
          scopeId: "tasks" as const,
          aggregateId: row.aggregateId,
          actorUserId: row.actorUserId ?? null,
          correlationId: row.correlationId ?? null,
          causationId: row.causationId ?? null,
          occurredAt: new Date(row.occurredAt).toISOString(),
          payload: (row.payload ?? {}) as Record<string, any>,
        };
        await this.dispatchEvent(event);
        dispatched += 1;
      }
    });
    return dispatched;
  }

  async publishBatch(events: PublishOptions[]): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e)));
  }
}


