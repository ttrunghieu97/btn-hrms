import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const traceLogs = pgTable(
  "trace_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    traceId: text("trace_id").notNull(),
    spanId: text("span_id").notNull(),
    parentSpanId: text("parent_span_id"),
    name: text("name").notNull(),
    correlationId: text("correlation_id"),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    error: text("error"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxTraceId: index("idx_trace_logs_trace_id").on(t.traceId),
    idxName: index("idx_trace_logs_name").on(t.name),
    idxCreatedAt: index("idx_trace_logs_created_at").on(t.createdAt),
  }),
);
