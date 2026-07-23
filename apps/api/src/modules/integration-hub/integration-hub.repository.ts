import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { AppDatabase } from "../../infrastructure/database/database-client.type";
import * as schema from "../../infrastructure/database/schema";

const DEFAULT_WEBHOOK_LEASE_MS = 30000;

export type WebhookSubscriptionRecord = typeof schema.webhookSubscriptions.$inferSelect;

export type WebhookDeliveryClaim = Pick<
  typeof schema.webhookDeliveries.$inferSelect,
  "id" | "subscriptionId" | "attemptCount" | "requestHeaders" | "payload"
>;

function claimDeliveriesSql(limit: number, leaseMs: number) {
  return sql`
    WITH candidates AS (
      SELECT id
      FROM webhook_deliveries
      WHERE status = 'pending'
        AND next_attempt_at <= now()
        AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY next_attempt_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE webhook_deliveries wd
    SET status = 'processing',
        lease_until = now() + (${leaseMs} * interval '1 millisecond')
    FROM candidates
    WHERE wd.id = candidates.id
    RETURNING wd.*
  `;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(
  row: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): string {
  const value = row[camelKey] ?? row[snakeKey];
  if (typeof value !== "string" || !value) {
    throw new Error(`Malformed webhook delivery claim: missing ${snakeKey}`);
  }
  return value;
}

function readHeaders(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value);
  if (entries.some(([, headerValue]) => typeof headerValue !== "string")) {
    throw new Error("Malformed webhook delivery claim: invalid request_headers");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function normalizeDeliveryRow(row: unknown): WebhookDeliveryClaim {
  if (!isRecord(row)) {
    throw new Error("Malformed webhook delivery claim");
  }
  const rawAttemptCount = row.attemptCount ?? row.attempt_count ?? 0;
  const attemptCount = Number(rawAttemptCount);
  if (!Number.isInteger(attemptCount) || attemptCount < 0) {
    throw new Error("Malformed webhook delivery claim: invalid attempt_count");
  }

  return {
    id: readRequiredString(row, "id", "id"),
    subscriptionId: readRequiredString(row, "subscriptionId", "subscription_id"),
    attemptCount,
    requestHeaders: readHeaders(row.requestHeaders ?? row.request_headers),
    payload: row.payload ?? {},
  };
}

function normalizeDeliveryRows(result: unknown): WebhookDeliveryClaim[] {
  const rows = Array.isArray(result)
    ? result
    : isRecord(result) && Array.isArray(result.rows)
      ? result.rows
      : [];
  return rows.map(normalizeDeliveryRow);
}

@Injectable()
export class IntegrationHubRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  createSubscription(input: {
    eventType: string;
    targetUrl: string;
    secret: string;
    status?: "active" | "disabled";
  }) {
    return this.db
      .insert(schema.webhookSubscriptions)
      .values({
        eventType: input.eventType,
        targetUrl: input.targetUrl,
        secret: input.secret,
        status: input.status ?? "active",
      })
      .returning();
  }

  listSubscriptions() {
    return this.db.select().from(schema.webhookSubscriptions);
  }

  getSubscription(input: { id: string }) {
    return this.db.query.webhookSubscriptions.findFirst({
      where: eq(schema.webhookSubscriptions.id, input.id),
    });
  }

  updateSubscription(input: {
    id: string;
    targetUrl?: string;
    secret?: string;
    status?: "active" | "disabled";
  }) {
    return this.db
      .update(schema.webhookSubscriptions)
      .set({
        ...(input.targetUrl ? { targetUrl: input.targetUrl } : null),
        ...(input.secret ? { secret: input.secret } : null),
        ...(input.status ? { status: input.status } : null),
        updatedAt: sql`now()`,
      })
      .where(eq(schema.webhookSubscriptions.id, input.id))
      .returning();
  }

  deleteSubscription(input: { id: string }) {
    return this.db
      .delete(schema.webhookSubscriptions)
      .where(eq(schema.webhookSubscriptions.id, input.id))
      .returning();
  }

  listActiveSubscriptionsForEvent(input: { eventType: string }) {
    return this.db
      .select()
      .from(schema.webhookSubscriptions)
      .where(
        and(
          eq(schema.webhookSubscriptions.eventType, input.eventType),
          eq(schema.webhookSubscriptions.status, "active"),
        ),
      );
  }

  enqueueDelivery(input: {
    subscriptionId: string;
    eventId: string;
    eventType: string;
    requestHeaders: Record<string, string>;
    payload: unknown;
  }) {
    return this.db
      .insert(schema.webhookDeliveries)
      .values({
        subscriptionId: input.subscriptionId,
        eventId: input.eventId,
        eventType: input.eventType,
        requestHeaders: input.requestHeaders,
        payload: input.payload,
        status: "pending",
        attemptCount: 0,
      })
      .onConflictDoNothing();
  }

  async claimPendingDeliveries(
    limit = 100,
    leaseMs = DEFAULT_WEBHOOK_LEASE_MS,
  ): Promise<WebhookDeliveryClaim[]> {
    const result = await this.db.execute(claimDeliveriesSql(limit, leaseMs));
    return normalizeDeliveryRows(result);
  }

  findPendingDeliveries(limit = 100) {
    return this.claimPendingDeliveries(limit);
  }

  markDeliveryAttempt(input: {
    id: string;
    status: "pending" | "delivered" | "failed";
    attemptCount: number;
    lastError?: string | null;
    nextAttemptAt?: Date | null;
    deliveredAt?: Date | null;
  }) {
    return this.db
      .update(schema.webhookDeliveries)
      .set({
        status: input.status,
        attemptCount: input.attemptCount,
        lastAttemptAt: sql`now()`,
        lastError: input.lastError ?? null,
        ...(input.nextAttemptAt instanceof Date
          ? { nextAttemptAt: input.nextAttemptAt }
          : null),
        leaseUntil: null,
        ...(input.deliveredAt instanceof Date
          ? { deliveredAt: input.deliveredAt }
          : null),
      })
      .where(eq(schema.webhookDeliveries.id, input.id));
  }

  getSubscriptionById(subscriptionId: string) {
    return this.db.query.webhookSubscriptions.findFirst({
      where: eq(schema.webhookSubscriptions.id, subscriptionId),
    });
  }
}
