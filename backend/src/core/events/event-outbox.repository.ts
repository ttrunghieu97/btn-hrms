import { Inject, Injectable } from "@nestjs/common";
import { count, eq, min, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import * as schema from "../../infrastructure/database/schema";
import type { CanonicalEventEnvelope } from "./canonical-event-envelope";
import type { AppDatabase } from "../../infrastructure/database/database-client.type";

const DEFAULT_OUTBOX_BACKOFF_MS = 5000;
const MAX_OUTBOX_BACKOFF_MS = 60000;
const DEFAULT_OUTBOX_LEASE_MS = 30000;
const DEFAULT_OUTBOX_MAX_ATTEMPTS = 12;

function computeNextAttemptAt(attemptCount: number, attemptedAt: Date) {
  const multiplier = Math.max(0, attemptCount - 1);
  const baseDelayMs = Math.min(
    MAX_OUTBOX_BACKOFF_MS,
    DEFAULT_OUTBOX_BACKOFF_MS * Math.pow(2, multiplier),
  );
  // Add jitter: ±25% of base delay
  const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
  const delayMs = Math.round(baseDelayMs * jitterFactor);
  return new Date(attemptedAt.getTime() + delayMs);
}

function hasAttemptsRemaining(attemptCount: number, maxAttempts: number) {
  return attemptCount < maxAttempts;
}

type RawOutboxRow = Record<string, unknown>;

export type ClaimedOutboxRow = typeof schema.eventOutbox.$inferSelect;

function isRecord(value: unknown): value is RawOutboxRow {
  return typeof value === "object" && value !== null;
}

function asDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(String(value));
}

function toOutboxRow(row: RawOutboxRow): ClaimedOutboxRow {
  return {
    id: String(row.id),
    eventType: String(row.eventType ?? row.event_type),
    eventVersion: Number(row.eventVersion ?? row.event_version ?? 1),
    producerContext: String(row.producerContext ?? row.producer_context),
    aggregateId:
      row.aggregateId === null || row.aggregate_id === null
        ? null
        : String(row.aggregateId ?? row.aggregate_id),
    correlationId:
      row.correlationId === null || row.correlation_id === null
        ? null
        : String(row.correlationId ?? row.correlation_id),
    causationId:
      row.causationId === null || row.causation_id === null
        ? null
        : String(row.causationId ?? row.causation_id),
    payload: row.payload ?? {},
    occurredAt: asDate(row.occurredAt ?? row.occurred_at) ?? new Date(),
    publishedAt: asDate(row.publishedAt ?? row.published_at),
    attemptCount: Number(row.attemptCount ?? row.attempt_count ?? 0),
    maxAttempts: Number(row.maxAttempts ?? row.max_attempts ?? 12),
    lastAttemptAt: asDate(row.lastAttemptAt ?? row.last_attempt_at),
    nextAttemptAt:
      asDate(row.nextAttemptAt ?? row.next_attempt_at) ?? new Date(),
    leaseUntil: asDate(row.leaseUntil ?? row.lease_until),
    failedAt: asDate(row.failedAt ?? row.failed_at),
    lastError:
      row.lastError === null || row.last_error === null
        ? null
        : String(row.lastError ?? row.last_error),
    createdAt: asDate(row.createdAt ?? row.created_at) ?? new Date(),
  };
}

function claimedOutboxRows(result: unknown): ClaimedOutboxRow[] {
  const rows = Array.isArray(result)
    ? result
    : isRecord(result) && Array.isArray(result.rows)
      ? result.rows
      : [];
  return rows.filter(isRecord).map(toOutboxRow);
}

function markLeaseReleased() {
  return null;
}

function claimOutboxSql(limit: number, leaseMs: number) {
  return sql`
    WITH candidates AS (
      SELECT id
      FROM event_outbox
      WHERE published_at IS NULL
        AND failed_at IS NULL
        AND next_attempt_at <= now()
        AND attempt_count < max_attempts
        AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE event_outbox eo
    SET lease_until = now() + (${leaseMs} * interval '1 millisecond')
    FROM candidates
    WHERE eo.id = candidates.id
    RETURNING eo.*
  `;
}

function outboxSummaryWhere() {
  return sql`${schema.eventOutbox.publishedAt} IS NULL AND ${schema.eventOutbox.failedAt} IS NULL`;
}

@Injectable()
export class EventOutboxRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findAggregatesWithMultipleEvents(limit = 50): Promise<string[]> {
    const result = await this.db.execute(
      sql`SELECT aggregate_id, count(*) as cnt
          FROM event_outbox
          WHERE aggregate_id IS NOT NULL AND published_at IS NOT NULL
          GROUP BY aggregate_id
          HAVING count(*) > 1
          ORDER BY cnt DESC
          LIMIT ${limit}`,
    );
    return (Array.isArray(result) ? result : (result as any)?.rows ?? [])
      .map((r: any) => r.aggregate_id ?? r.aggregateId)
      .filter(Boolean);
  }

  async insert(envelope: CanonicalEventEnvelope, tx?: AppDatabase) {
    const executor = tx ?? this.db;
    const [row] = await executor
      .insert(schema.eventOutbox)
      .values({
        eventType: envelope.eventType,
        eventVersion: envelope.eventVersion,
        producerContext: envelope.producerContext,
        aggregateId: envelope.aggregateId,
        correlationId: envelope.correlationId ?? null,
        causationId: envelope.causationId ?? null,
        payload: envelope.payload,
        occurredAt: new Date(envelope.occurredAt),
      } as typeof schema.eventOutbox.$inferInsert)
      .returning();
    return row ?? null;
  }

  async claimUnpublished(limit = 100, leaseMs = DEFAULT_OUTBOX_LEASE_MS) {
    const result = await this.db.execute(claimOutboxSql(limit, leaseMs));
    return claimedOutboxRows(result);
  }

  async listUnpublished(limit = 100) {
    return this.claimUnpublished(limit);
  }

  async getUnpublishedSummary() {
    const [row] = await this.db
      .select({
        count: count(),
        oldestCreatedAt: min(schema.eventOutbox.createdAt),
      })
      .from(schema.eventOutbox)
      .where(outboxSummaryWhere());

    const unpublishedCount = Number(row?.count ?? 0);
    const oldestUnpublishedAgeMs = row?.oldestCreatedAt
      ? Math.max(0, Date.now() - new Date(row.oldestCreatedAt).getTime())
      : 0;

    return {
      unpublishedCount: Number.isFinite(unpublishedCount)
        ? Math.max(0, unpublishedCount)
        : 0,
      oldestUnpublishedAgeMs,
    };
  }

  async recordAttempt(id: string, attemptedAt = new Date()) {
    const [row] = await this.db
      .update(schema.eventOutbox)
      .set({
        attemptCount: sql`${schema.eventOutbox.attemptCount} + 1`,
        lastAttemptAt: attemptedAt,
      })
      .where(eq(schema.eventOutbox.id, id))
      .returning();
    return row ?? null;
  }

  async recordFailure(
    id: string,
    errorMessage: string,
    attemptedAt = new Date(),
    attemptCount = 1,
    maxAttempts = DEFAULT_OUTBOX_MAX_ATTEMPTS,
  ) {
    const attemptsRemaining = hasAttemptsRemaining(attemptCount, maxAttempts);
    const [row] = await this.db
      .update(schema.eventOutbox)
      .set({
        attemptCount,
        maxAttempts,
        lastAttemptAt: attemptedAt,
        nextAttemptAt: attemptsRemaining
          ? computeNextAttemptAt(attemptCount, attemptedAt)
          : attemptedAt,
        leaseUntil: markLeaseReleased(),
        failedAt: attemptsRemaining ? null : attemptedAt,
        lastError: errorMessage,
      })
      .where(eq(schema.eventOutbox.id, id))
      .returning();
    return row ?? null;
  }

  async markPublished(id: string, publishedAt = new Date()) {
    const [row] = await this.db
      .update(schema.eventOutbox)
      .set({
        publishedAt,
        leaseUntil: markLeaseReleased(),
        failedAt: null,
        lastError: null,
      })
      .where(eq(schema.eventOutbox.id, id))
      .returning();
    return row ?? null;
  }
}
