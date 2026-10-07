import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const eventOutbox = pgTable(
  "event_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    producerContext: text("producer_context").notNull(),
    aggregateId: uuid("aggregate_id"),
    correlationId: text("correlation_id"),
    causationId: text("causation_id"),
    payload: jsonb("payload").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(12),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEventType: index("idx_event_outbox_event_type").on(table.eventType),
    idxPublishedAt: index("idx_event_outbox_published_at").on(table.publishedAt),
    idxDispatcher: index("idx_event_outbox_dispatcher").on(
      table.publishedAt,
      table.nextAttemptAt,
    ),
  }),
);
