import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { requestIdempotencyStatusEnum } from "./enums";

export const requestIdempotency = pgTable(
  "request_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id"),
    endpoint: text("endpoint").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash"),
    status: requestIdempotencyStatusEnum("status").default("pending").notNull(),
    responsePayload: jsonb("response_payload"),
    errorPayload: jsonb("error_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqIdempotency: uniqueIndex(
      "uq_request_idempotency_actor_endpoint_key",
    ).on(table.actorUserId, table.endpoint, table.idempotencyKey),
    idxStatus: index("idx_request_idempotency_status").on(table.status),
  }),
);
