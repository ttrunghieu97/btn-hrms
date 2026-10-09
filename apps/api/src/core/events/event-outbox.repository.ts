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

export interface OutboxBackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
}

export function computeNextAttemptAt(
  attemptCount: number,
  attemptedAt: Date,
  options?: OutboxBackoffOptions,
) {
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_OUTBOX_BACKOFF_MS;
  const maxDelayMs = options?.maxDelayMs ?? MAX_OUTBOX_BACKOFF_MS;
  const jitterRatio = options?.jitterRatio ?? 0.25;

  const multiplier = Math.min(Math.max(0, attemptCount - 1), 10);
  const baseDelay = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, multiplier),
  );
  // Add jitter: ±jitterRatio of base delay
  const jitterFactor = (1 - jitterRatio) + Math.random() * (2 * jitterRatio);
  const delayMs = Math.round(baseDelay * jitterFactor);
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

  async recordPermanentFailure(
    id: string,
    errorMessage: string,
    attemptedAt = new Date(),
  ): Promise<ClaimedOutboxRow | null> {
    const [row] = await this.db
      .update(schema.eventOutbox)
      .set({
        attemptCount: schema.eventOutbox.maxAttempts,
        lastAttemptAt: attemptedAt,
        leaseUntil: markLeaseReleased(),
        failedAt: attemptedAt,
        lastError: `permanent_failure: ${errorMessage}`,
      })
      .where(eq(schema.eventOutbox.id, id))
      .returning();
    return row ? toOutboxRow(row as RawOutboxRow) : null;
  }

  async recoverExpiredLeases(
    leaseGraceMs = 0,
  ): Promise<{ recoveredCount: number; deadLetteredCount: number }> {
    const graceInterval =
      leaseGraceMs > 0
        ? sql`${leaseGraceMs} * interval '1 millisecond'`
        : sql`interval '0 millisecond'`;

    const result = await this.db.execute(sql`
      WITH expired AS (
        SELECT id, attempt_count, max_attempts
        FROM event_outbox
        WHERE published_at IS NULL
          AND failed_at IS NULL
          AND lease_until IS NOT NULL
          AND lease_until <= (now() - ${graceInterval})
        ORDER BY lease_until ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      ),
      updated AS (
        UPDATE event_outbox eo
        SET
          attempt_count = eo.attempt_count + 1,
          last_attempt_at = now(),
          lease_until = NULL,
          last_error = CASE
            WHEN eo.attempt_count + 1 >= eo.max_attempts
            THEN 'lease_expired_exhausted: worker timed out or crashed'
            ELSE 'lease_expired: reclaimed after worker timeout'
          END,
          failed_at = CASE
            WHEN eo.attempt_count + 1 >= eo.max_attempts
            THEN now()
            ELSE NULL
          END,
          next_attempt_at = CASE
            WHEN eo.attempt_count + 1 >= eo.max_attempts
            THEN now()
            ELSE now() + interval '5 seconds'
          END
        FROM expired
        WHERE eo.id = expired.id
        RETURNING eo.id, eo.failed_at
      )
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE failed_at IS NOT NULL)::int as dead_lettered
      FROM updated
    `);

    const rows = Array.isArray(result) ? result : (result as any)?.rows ?? [];
    const row = rows[0] ?? {};
    return {
      recoveredCount: Number(row.total ?? 0),
      deadLetteredCount: Number(row.dead_lettered ?? 0),
    };
  }

  async listDeadLetters(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ClaimedOutboxRow[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const rows = await this.db
      .select()
      .from(schema.eventOutbox)
      .where(sql`${schema.eventOutbox.failedAt} IS NOT NULL`)
      .orderBy(sql`${schema.eventOutbox.failedAt} DESC`)
      .limit(limit)
      .offset(offset);
    return rows.map((r) => toOutboxRow(r as RawOutboxRow));
  }

  async countDeadLetters(): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(schema.eventOutbox)
      .where(sql`${schema.eventOutbox.failedAt} IS NOT NULL`);
    return Number(row?.count ?? 0);
  }

  async findDeadLetterById(id: string): Promise<ClaimedOutboxRow | null> {
    const rows = await this.db
      .select()
      .from(schema.eventOutbox)
      .where(
        sql`${schema.eventOutbox.id} = ${id} AND ${schema.eventOutbox.failedAt} IS NOT NULL`,
      )
      .limit(1);
    const row = rows[0];
    return row ? toOutboxRow(row as RawOutboxRow) : null;
  }

  async replayDeadLetter(
    id: string,
    actorUserId?: string | null,
  ): Promise<ClaimedOutboxRow | null> {
    const [row] = await this.db
      .update(schema.eventOutbox)
      .set({
        failedAt: null,
        lastError: null,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        publishedAt: null,
        leaseUntil: null,
      })
      .where(
        sql`${schema.eventOutbox.id} = ${id} AND ${schema.eventOutbox.failedAt} IS NOT NULL`,
      )
      .returning();

    if (row) {
      await this.auditDlqAction("event_dlq_replay", id, actorUserId ?? null, {
        eventType: row.eventType,
        replayedAt: new Date().toISOString(),
      });
    }
    return row ? toOutboxRow(row as RawOutboxRow) : null;
  }

  async replayAllDeadLetters(actorUserId?: string | null): Promise<number> {
    const rows = await this.db
      .update(schema.eventOutbox)
      .set({
        failedAt: null,
        lastError: null,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        publishedAt: null,
        leaseUntil: null,
      })
      .where(
        sql`${schema.eventOutbox.failedAt} IS NOT NULL AND (${schema.eventOutbox.lastError} IS NULL OR NOT ${schema.eventOutbox.lastError} LIKE 'discarded%')`,
      )
      .returning({ id: schema.eventOutbox.id });

    const updatedCount = rows.length;
    if (updatedCount > 0) {
      await this.auditDlqAction(
        "event_dlq_replay_all",
        null,
        actorUserId ?? null,
        {
          replayedCount: updatedCount,
          eventIds: rows.map((r) => r.id),
          replayedAt: new Date().toISOString(),
        },
      );
    }
    return updatedCount;
  }

  async discardDeadLetter(
    id: string,
    reason?: string,
    actorUserId?: string | null,
    permanent = false,
  ): Promise<ClaimedOutboxRow | null> {
    const existing = await this.findDeadLetterById(id);
    if (!existing) return null;

    if (permanent) {
      await this.db
        .delete(schema.eventOutbox)
        .where(eq(schema.eventOutbox.id, id));
    } else {
      await this.db
        .update(schema.eventOutbox)
        .set({
          lastError: `discarded: ${reason || "manually discarded by operator"}`,
          leaseUntil: null,
        })
        .where(eq(schema.eventOutbox.id, id));
    }

    await this.auditDlqAction("event_dlq_discard", id, actorUserId ?? null, {
      eventType: existing.eventType,
      reason: reason ?? "manually discarded",
      permanent,
      discardedAt: new Date().toISOString(),
    });

    return existing;
  }

  async auditDlqAction(
    action: string,
    entityId: string | null,
    actorUserId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.db.insert(schema.auditLogs).values({
        actorUserId: actorUserId ?? null,
        action,
        entity: "event_outbox",
        entityId,
        result: "SUCCESS",
        metadata: metadata ?? {},
      });
    } catch {
      // Non-fatal if audit write fails in test/isolated environments
    }
  }
}

