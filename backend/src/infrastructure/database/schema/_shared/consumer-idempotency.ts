import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const consumerIdempotency = pgTable(
  "consumer_idempotency",
  {
    consumerId: text("consumer_id").notNull(),
    eventId: uuid("event_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.consumerId, table.eventId] }),
    idxEventId: index("idx_consumer_idempotency_event_id").on(table.eventId),
  }),
);
