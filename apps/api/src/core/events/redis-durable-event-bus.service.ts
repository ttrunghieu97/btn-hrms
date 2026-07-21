import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hostname } from "os";
import { randomUUID } from "crypto";
import type Redis from "ioredis";
import { RequestContextService } from "../../shared/context/request-context.service";
import { ContextLogger } from "../../shared/logging/context-logger";
import { MetricsService } from "../../shared/metrics/metrics.service";
import { RedisEventsService } from "../../infrastructure/redis/redis-events.service";
import { IEventBus as EventBus, EventHandler } from "./event-bus.interface";
import {
  assertCanonicalEventEnvelope,
  CanonicalEventEnvelope,
} from "./canonical-event-envelope";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../infrastructure/database/schema";
import { isBootstrapFlagEnabled } from "../../shared/config/startup-flags";

type EventEnvelope = CanonicalEventEnvelope<unknown>;

type EventUpcaster = (envelope: EventEnvelope) => EventEnvelope;

type EventBusHealth = {
  ok: boolean;
  pending: number;
  detail?: string;
};

type EventLike = {
  eventType?: unknown;
  eventVersion?: unknown;
  producerContext?: unknown;
  scopeId?: unknown;
  payload?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function eventLike(value: unknown): EventLike {
  return isRecord(value) ? value : {};
}

function eventConstructorName(value: unknown) {
  return isRecord(value) ? value.constructor?.name : undefined;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function payloadAggregateId(payload: unknown) {
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" ? payload.id : null;
}

function dispatchPayload(envelope: EventEnvelope): Record<string, unknown> {
  return {
    ...(isRecord(envelope.payload)
      ? envelope.payload
      : { value: envelope.payload }),
    scopeId: envelope.scopeId ?? null,
    correlationId: envelope.correlationId ?? null,
    eventType: envelope.eventType,
    eventVersion: envelope.eventVersion,
    producerContext: envelope.producerContext,
    occurredAt: envelope.occurredAt,
  };
}

@Injectable()
export class RedisDurableEventBus
  implements EventBus, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly handlers = new Map<string, EventHandler<unknown>[]>();
  private readonly upcasters = new Map<string, EventUpcaster[]>();
  private readonly logger: ContextLogger;
  private readonly streamKey: string;
  private readonly dlqStreamKey: string;
  private readonly consumerGroup: string;
  private readonly consumerName: string;
  private readonly maxRetries: number;
  private readonly reclaimIdleMs: number;
  private readonly reclaimCount: number;
  private readonly streamMaxLen: number | null;
  private running = false;
  private readonly redis: Redis | null;
  private readonly requestContext: RequestContextService;
  private lastReclaimAt = 0;

  constructor(
    redisEventsService: RedisEventsService,
    config: ConfigService,
    requestContext: RequestContextService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly metrics: MetricsService,
  ) {
    this.requestContext = requestContext;
    this.logger = new ContextLogger(requestContext, RedisDurableEventBus.name);
    this.redis = redisEventsService.getClientOrNull();
    const configuredMaxLen = Number(config.get("EVENT_BUS_STREAM_MAXLEN"));
    this.streamMaxLen =
      Number.isFinite(configuredMaxLen) && configuredMaxLen > 0
        ? Math.floor(configuredMaxLen)
        : null;
    this.streamKey =
      String(config.get("EVENT_BUS_STREAM_KEY") || "").trim() ||
      "hrms:domain-events";
    this.dlqStreamKey =
      String(config.get("EVENT_BUS_DLQ_STREAM_KEY") || "").trim() ||
      `${this.streamKey}:dlq`;
    this.consumerGroup =
      String(config.get("EVENT_BUS_CONSUMER_GROUP") || "").trim() || "hrms-api";
    this.maxRetries = 5;
    this.reclaimIdleMs = 60_000;
    this.reclaimCount = 20;
    this.consumerName = `${hostname()}-${process.pid}`;
  }

  on<TEvent = unknown>(eventName: string, handler: EventHandler<TEvent>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push((event: unknown) => handler(event as TEvent));
    this.handlers.set(eventName, list);
  }

  onUpcast(eventType: string, upcaster: EventUpcaster): void {
    const list = this.upcasters.get(eventType) ?? [];
    list.push(upcaster);
    this.upcasters.set(eventType, list);
  }

  async publishAll(events: unknown[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async publish(event: unknown): Promise<void> {
    if (!event) return;
    if (!this.redis) {
      throw new Error("Redis durable event bus is not available");
    }
    const envelope = this.toEnvelope(event);
    this.metrics.incrementEventBusPublished();
    try {
      const serializedEnvelope = JSON.stringify(envelope);
      if (this.streamMaxLen) {
        await this.redis.xadd(
          this.streamKey,
          "MAXLEN",
          "~",
          String(this.streamMaxLen),
          "*",
          "data",
          serializedEnvelope,
        );
      } else {
        await this.redis.xadd(
          this.streamKey,
          "*",
          "data",
          serializedEnvelope,
        );
      }
    } catch (error: unknown) {
      this.metrics.incrementEventBusFailed();
      this.logger.error({
        msg: "event_bus_publish_failed",
        eventName: envelope.eventType,
        reason: errorMessage(error, "xadd_failed"),
      });
      throw error;
    }
  }
  isAvailable(): boolean {
    return (
      this.redis !== null &&
      isBootstrapFlagEnabled("FEATURE_REDIS_EVENT_BUS", false, true)
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!isBootstrapFlagEnabled("FEATURE_REDIS_EVENT_BUS", false, true)) {
      this.logger.log({
        msg: "event_bus_bootstrap_skipped",
        reason: "bootstrap_profile_disabled",
      });
      return;
    }

    if (!this.redis) {
      this.logger.warn({
        msg: "event_bus_bootstrap_skipped",
        reason: "redis_unavailable",
      });
      return;
    }

    this.running = true;
    await this.ensureConsumerGroup();
    void this.consumeLoop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  async healthCheck(): Promise<EventBusHealth> {
    if (!this.isAvailable()) {
      return { ok: true, pending: 0, detail: "disabled" };
    }
    if (!this.redis) {
      return { ok: false, pending: 0, detail: "redis_unavailable" };
    }

    try {
      const pending = await this.withTimeout(this.getPendingCount(), 1500);
      this.metrics.setEventBusPendingCount(pending);
      return { ok: true, pending };
    } catch (error: unknown) {
      return {
        ok: false,
        pending: 0,
        detail: errorMessage(error, "event_bus_unhealthy"),
      };
    }
  }

  private toEnvelope(event: unknown): EventEnvelope {
    const source = eventLike(event);
    const eventType = String(
      source.eventType || eventConstructorName(event) || "UnknownEvent",
    );
    const eventVersion = Number(source.eventVersion ?? 1);
    const producerContext = String(source.producerContext || "core");
    const scopeId = source.scopeId ?? null;

    const payload: unknown = JSON.parse(
      JSON.stringify(source.payload ?? event),
    );

    const envelope: EventEnvelope = {
      eventId: randomUUID(),
      eventType,
      eventVersion: Number.isInteger(eventVersion) ? eventVersion : 1,
      producerContext,
      scopeId: typeof scopeId === "string" ? scopeId : null,
      aggregateId: payloadAggregateId(payload),
      correlationId: this.requestContext.get()?.requestId ?? null,
      causationId: null,
      payload,
      occurredAt: new Date().toISOString(),
    };
    assertCanonicalEventEnvelope(envelope, "redis_event_bus");
    return envelope;
  }

  private async ensureConsumerGroup() {
    if (!this.redis) return;

    try {
      await this.redis.xgroup(
        "CREATE",
        this.streamKey,
        this.consumerGroup,
        "0",
        "MKSTREAM",
      );
      this.logger.log({
        msg: "event_bus_group_created",
        streamKey: this.streamKey,
        consumerGroup: this.consumerGroup,
      });
    } catch (error: unknown) {
      const message = errorMessage(error, "");
      if (message.includes("BUSYGROUP")) return;
      this.logger.warn({
        msg: "event_bus_group_create_failed",
        streamKey: this.streamKey,
        consumerGroup: this.consumerGroup,
        reason: message,
      });
    }
  }

  private async consumeLoop() {
    if (!this.redis) return;

    while (this.running) {
      try {
        await this.reclaimPendingMessages();
        const result = (await this.redis.xreadgroup(
          "GROUP",
          this.consumerGroup,
          this.consumerName,
          "COUNT",
          "20",
          "BLOCK",
          "5000",
          "STREAMS",
          this.streamKey,
          ">",
        )) as [string, [string, string[]][]][] | null;
        if (!result) continue;

        for (const [, entries] of result) {
          for (const [id, fields] of entries) {
            await this.processStreamEntry(id, fields, 1);
          }
        }
      } catch (error: unknown) {
        this.logger.warn({
          msg: "event_bus_consume_loop_error",
          reason: errorMessage(error, "consume_failed"),
        });
        await this.sleep(1000);
      }
    }
  }

  private async processStreamEntry(
    id: string,
    fields: string[],
    deliveryCount: number,
  ) {
    if (!this.redis) return;

    const raw = this.extractField(fields, "data");
    if (!raw) {
      this.logger.warn({
        msg: "event_bus_empty_stream_entry",
        eventId: id,
        reason: "missing_data_field",
      });
      await this.redis.xack(this.streamKey, this.consumerGroup, id);
      return;
    }

    let envelope: EventEnvelope | null = null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) {
        throw new Error("malformed_json_payload");
      }

      envelope = {
        eventId: String(parsed.eventId ?? ""),
        eventType: String(parsed.eventType ?? ""),
        eventVersion: Number(parsed.eventVersion ?? 0),
        producerContext: String(parsed.producerContext ?? ""),
        scopeId: typeof parsed.scopeId === "string" ? parsed.scopeId : null,
        aggregateId: typeof parsed.aggregateId === "string" ? parsed.aggregateId : null,
        occurredAt: String(parsed.occurredAt ?? ""),
        correlationId: typeof parsed.correlationId === "string" ? parsed.correlationId : null,
        causationId: typeof parsed.causationId === "string" ? parsed.causationId : null,
        payload: parsed.payload,
      };

      assertCanonicalEventEnvelope(envelope, "redis_event_consumer");

      const upcasters = this.upcasters.get(envelope.eventType) ?? [];
      for (const upcast of upcasters) {
        envelope = upcast(envelope);
      }
      const eventType = envelope.eventType;

      await this.dispatch(eventType, dispatchPayload(envelope));
      await this.redis.xack(this.streamKey, this.consumerGroup, id);
      this.metrics.incrementEventBusProcessed();
    } catch (error: unknown) {
      const reason = errorMessage(error, "dispatch_failed");
      this.metrics.incrementEventBusFailed();
      this.metrics.incrementEventBusRetried();
      this.metrics.incrementContractValidationFailed();
      this.logger.error({
        msg: "event_bus_dispatch_failed",
        eventId: id,
        eventName: envelope?.eventType || "UnknownEvent",
        attempts: deliveryCount,
        reason,
      });
      await this.recordContractFailureAudit({
        contractName: "canonical-event-envelope",
        contractVersion: "v1",
        producer: envelope?.producerContext || "unknown",
        payload: envelope?.payload ?? raw,
        reason,
        correlationId: envelope?.correlationId ?? null,
      });

      if (deliveryCount >= this.maxRetries) {
        await this.moveToDlq(id, raw, deliveryCount, reason);
      }
      // For non-threshold failures, do not ACK so it remains pending.
    }
  }

  private async reclaimPendingMessages() {
    if (!this.redis) return;

    const now = Date.now();
    if (now - this.lastReclaimAt < this.reclaimIdleMs) {
      return;
    }
    this.lastReclaimAt = now;

    const pendingEntries = (await this.redis.xpending(
      this.streamKey,
      this.consumerGroup,
      "-",
      "+",
      this.reclaimCount,
    )) as [string, string, number, number][];

    if (!Array.isArray(pendingEntries) || pendingEntries.length === 0) {
      this.metrics.setEventBusPendingCount(0);
      return;
    }
    this.metrics.setEventBusPendingCount(pendingEntries.length);

    const stale = pendingEntries.filter(
      (entry) => Number(entry[2]) >= this.reclaimIdleMs,
    );
    if (stale.length === 0) return;

    const ids = stale.map((entry) => entry[0]);
    const claimed = (await this.redis.xclaim(
      this.streamKey,
      this.consumerGroup,
      this.consumerName,
      this.reclaimIdleMs,
      ...ids,
    )) as [string, string[]][];

    const attemptsById = new Map<string, number>();
    for (const [entryId, , , deliveries] of stale) {
      attemptsById.set(entryId, Number(deliveries) || 1);
    }

    for (const [id, fields] of claimed || []) {
      await this.processStreamEntry(id, fields, attemptsById.get(id) || 1);
    }
  }

  private async moveToDlq(
    id: string,
    rawEnvelope: string,
    attempts: number,
    reason?: string,
  ) {
    if (!this.redis) return;

    await this.redis.xadd(
      this.dlqStreamKey,
      "*",
      "data",
      rawEnvelope,
      "originalStream",
      this.streamKey,
      "originalId",
      id,
      "attempts",
      String(attempts),
      "failedAt",
      new Date().toISOString(),
      "reason",
      reason || "unknown",
    );
    this.metrics.incrementEventBusDlq();
    await this.redis.xack(this.streamKey, this.consumerGroup, id);
    this.logger.warn({
      msg: "event_bus_moved_to_dlq",
      eventId: id,
      dlqStreamKey: this.dlqStreamKey,
      attempts,
    });
  }

  private async dispatch(eventName: string, payload: unknown) {
    const handlers = this.handlers.get(eventName) ?? [];
    for (const handler of handlers) {
      await handler(payload);
    }
  }

  private async recordContractFailureAudit(input: {
    contractName: string;
    contractVersion: string;
    producer: string;
    payload: unknown;
    reason: string;
    correlationId?: string | null;
  }) {
    try {
      await this.db.insert(schema.auditLogs).values({
        actorUserId: null,
        action: "contract_validation_failed",
        entity: input.contractName,
        entityId: null,
        metadata: {
          contractVersion: input.contractVersion,
          producer: input.producer,
          reason: input.reason,
          correlationId: input.correlationId ?? null,
          payloadFingerprint: JSON.stringify(input.payload).slice(0, 2000),
          failedAt: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      this.logger.warn({
        msg: "contract_failure_audit_write_failed",
        reason: errorMessage(error, "audit_write_failed"),
      });
    }
  }

  private extractField(fields: string[], key: string): string | null {
    for (let i = 0; i < fields.length - 1; i += 2) {
      if (fields[i] === key) return fields[i + 1] ?? null;
    }
    return null;
  }

  private async getPendingCount(): Promise<number> {
    if (!this.redis) return 0;

    const summary = (await this.redis.xpending(
      this.streamKey,
      this.consumerGroup,
    )) as [number | string, string, string, [string, string][]];
    const count = Number(summary?.[0] ?? 0);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("event_bus_healthcheck_timeout")),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
