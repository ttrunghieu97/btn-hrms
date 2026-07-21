import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../identity/tables";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    result: text("result").$type<"SUCCESS" | "FAILED">(),
    reason: text("reason"),
    traceId: text("trace_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxActor: index("idx_audit_logs_actor_user_id").on(table.actorUserId),
    idxEntity: index("idx_audit_logs_entity_id").on(table.entityId),
    idxAction: index("idx_audit_logs_action").on(table.action),
    idxTraceId: index("idx_audit_logs_trace_id").on(table.traceId),
  }),
);
