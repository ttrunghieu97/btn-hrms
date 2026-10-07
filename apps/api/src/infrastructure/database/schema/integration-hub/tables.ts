import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { webhookSubscriptionStatusEnum, webhookDeliveryStatusEnum } from "./enums";

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    targetUrl: text("target_url").notNull(),
    secret: text("secret").notNull(),
    status: webhookSubscriptionStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxEventType: index("idx_webhook_subscriptions_event_type").on(t.eventType),
  }),
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull(),
    eventType: text("event_type").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    requestHeaders: jsonb("request_headers")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => ({
    uniqSubscriptionEvent: uniqueIndex("uniq_webhook_delivery_sub_event").on(
      t.subscriptionId,
      t.eventId,
    ),
    idxPending: index("idx_webhook_deliveries_pending").on(
      t.status,
      t.nextAttemptAt,
    ),
  }),
);
