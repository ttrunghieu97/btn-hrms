import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import {
  EventOutboxRepository,
  type ClaimedOutboxRow,
} from "./event-outbox.repository";
import { RedisDurableEventBus } from "./redis-durable-event-bus.service";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";
import { MetricsService } from "../../shared/metrics/metrics.service";
import type { CanonicalEventEnvelope } from "./canonical-event-envelope";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function outboxEnvelope(
  row: ClaimedOutboxRow,
): CanonicalEventEnvelope<unknown> {
  return {
    eventId: row.id,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    producerContext: row.producerContext,
    scopeId: null,
    aggregateId: row.aggregateId,
    correlationId: row.correlationId,
    causationId: row.causationId,
    occurredAt: row.occurredAt instanceof Date
      ? row.occurredAt.toISOString()
      : row.occurredAt
        ? new Date(String(row.occurredAt)).toISOString()
        : new Date().toISOString(),
    payload: row.payload,
  };
}

async function refreshOutboxMetrics(
  outboxRepo: EventOutboxRepository,
  metrics: MetricsService,
) {
  const summary = await outboxRepo.getUnpublishedSummary();
  metrics.setOutboxPendingCount(summary.unpublishedCount);
  metrics.setOutboxOldestUnpublishedAge(summary.oldestUnpublishedAgeMs);
}

function recordDispatchFailure(metrics: MetricsService) {
  metrics.incrementOutboxDispatchFailure();
}

function wasFinalAttempt(
  row: ClaimedOutboxRow,
  nextAttemptCount: number,
) {
  return nextAttemptCount >= (row?.maxAttempts ?? 12);
}

async function publishStagedRow(
  eventBus: RedisDurableEventBus,
  outboxRepo: EventOutboxRepository,
  row: ClaimedOutboxRow,
  metrics: MetricsService,
) {
  const attemptedAt = new Date();
  const nextAttemptCount = Number(row?.attemptCount ?? 0) + 1;
  try {
    await eventBus.publish(outboxEnvelope(row));
    await outboxRepo.recordAttempt(row.id, attemptedAt);
    await outboxRepo.markPublished(row.id);
    metrics?.incrementOutboxPublished?.(row.eventType);
  } catch (error: unknown) {
    await outboxRepo.recordFailure(
      row.id,
      errorMessage(error, "publish_failed"),
      attemptedAt,
      nextAttemptCount,
      Number(row?.maxAttempts ?? 12),
    );
    if (wasFinalAttempt(row, nextAttemptCount)) {
      metrics?.incrementOutboxDeadLetter?.(row.eventType);
    } else {
      metrics?.incrementOutboxRetry?.(row.eventType);
    }
    throw error;
  }
}

function logDispatchFailure(
  logger: ContextLogger,
  row: ClaimedOutboxRow,
  error: unknown,
) {
  logger.error({
    msg: "event_outbox_dispatch_failed",
    outboxId: row.id,
    eventType: row.eventType,
    reason: errorMessage(error, "publish_failed"),
  });
}

async function dispatchRow(
  row: ClaimedOutboxRow,
  eventBus: RedisDurableEventBus,
  outboxRepo: EventOutboxRepository,
  logger: ContextLogger,
  metrics: MetricsService,
) {
  try {
    await publishStagedRow(eventBus, outboxRepo, row, metrics);
  } catch (error: unknown) {
    recordDispatchFailure(metrics);
    logDispatchFailure(logger, row, error);
  }
}

function scheduleNext(
  running: boolean,
  callback: () => Promise<void>,
) {
  if (!running) return null;
  return setTimeout(() => {
    void callback();
  }, 1000);
}

const MAX_CONCURRENT_PER_TYPE = Number(process.env.OUTBOX_MAX_CONCURRENT_PER_TYPE ?? "25");
const POISON_EVENT_LIMIT = 20;

async function dispatchBatch(
  outboxRepo: EventOutboxRepository,
  eventBus: RedisDurableEventBus,
  logger: ContextLogger,
  metrics: MetricsService,
  limit: number,
) {
  const rows = await outboxRepo.claimUnpublished(limit);

  // Per-event-type concurrency throttle
  const typeCount = new Map<string, number>();
  const throttle = (row: ClaimedOutboxRow): boolean => {
    const count = (typeCount.get(row.eventType) ?? 0) + 1;
    typeCount.set(row.eventType, count);
    if (count > MAX_CONCURRENT_PER_TYPE) {
      logger.warn({
        msg: "event_outbox_type_throttled",
        eventType: row.eventType,
        concurrency: count,
      });
      return true;
    }
    return false;
  };

  for (const row of rows) {
    if (throttle(row)) {
      // Skip this row; it will be re-claimed next cycle
      continue;
    }
    // Poison event quarantine: events that have exceeded max attempts
    if ((row.attemptCount ?? 0) >= (row.maxAttempts ?? 12)) {
      metrics?.incrementOutboxDeadLetter?.(row.eventType);
      logger.warn({
        msg: "event_outbox_quarantine",
        outboxId: row.id,
        eventType: row.eventType,
        attempts: row.attemptCount,
      });
      // Mark as failed so it stops retrying
      await outboxRepo.recordFailure(
        row.id,
        "quarantined: exceeded max attempts",
        new Date(),
        row.maxAttempts ?? 12,
        row.maxAttempts ?? 12,
      );
      continue;
    }
    await dispatchRow(row, eventBus, outboxRepo, logger, metrics);
  }
  await refreshOutboxMetrics(outboxRepo, metrics);
  return rows.length;
}

function clearTimer(timer: NodeJS.Timeout | null) {
  if (timer) {
    clearTimeout(timer);
  }
}

async function runScheduledDispatch(
  service: EventOutboxDispatcherService,
) {
  try {
    await service.dispatchOnce();
  } catch (error: unknown) {
    recordDispatchFailure(getDispatcherMetrics(service));
    getDispatcherLogger(service).error({
      msg: "event_outbox_dispatch_cycle_failed",
      reason: errorMessage(error, "dispatch_cycle_failed"),
    });
  } finally {
    service["schedule"]();
  }
}

function setDispatcherTimer(
  service: EventOutboxDispatcherService,
  timer: NodeJS.Timeout | null,
) {
  service["timer"] = timer;
}

function getDispatcherRunning(service: EventOutboxDispatcherService) {
  return service["running"];
}

function getDispatcherLogger(service: EventOutboxDispatcherService) {
  return service["logger"];
}

function getDispatcherRepo(service: EventOutboxDispatcherService) {
  return service["outboxRepo"];
}

function getDispatcherBus(service: EventOutboxDispatcherService) {
  return service["eventBus"];
}

function getDispatcherMetrics(service: EventOutboxDispatcherService) {
  return service["metrics"];
}

async function dispatchFromService(service: EventOutboxDispatcherService, limit: number) {
  return dispatchBatch(
    getDispatcherRepo(service),
    getDispatcherBus(service),
    getDispatcherLogger(service),
    getDispatcherMetrics(service),
        limit,
  );
}

function scheduleDispatcher(service: EventOutboxDispatcherService) {
  const timer = scheduleNext(getDispatcherRunning(service), async () => {
    await runScheduledDispatch(service);
  });
  setDispatcherTimer(service, timer);
}

function stopDispatcher(service: EventOutboxDispatcherService) {
  clearTimer(service["timer"] ?? null);
  service["timer"] = null;
}

function startDispatcher(service: EventOutboxDispatcherService) {
  service["running"] = true;
  scheduleDispatcher(service);
}

function destroyDispatcher(service: EventOutboxDispatcherService) {
  service["running"] = false;
  stopDispatcher(service);
}

function dispatcherDispatchOnce(service: EventOutboxDispatcherService, limit: number) {
  return dispatchFromService(service, limit);
}
@Injectable()
export class EventOutboxDispatcherService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger: ContextLogger;
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outboxRepo: EventOutboxRepository,
    private readonly eventBus: RedisDurableEventBus,
    private readonly metrics: MetricsService,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, EventOutboxDispatcherService.name);
  }

  onApplicationBootstrap(): void {
    if (!this.eventBus.isAvailable()) {
      this.logger.warn({ msg: "event_outbox_dispatcher_skipped", reason: "redis_durable_event_bus_unavailable" });
      return;
    }
    this.logger.log({ msg: "event_outbox_dispatcher_started" });
    startDispatcher(this);
  }

  onModuleDestroy(): void {
    destroyDispatcher(this);
  }

  async dispatchOnce(limit = 25) {
    return dispatcherDispatchOnce(this, limit);
  }

  private schedule() {
    scheduleDispatcher(this);
  }
}
