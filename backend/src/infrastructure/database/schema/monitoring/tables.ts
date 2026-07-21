import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const systemHealthChecks = pgTable(
  "system_health_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    component: text("component").notNull(),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    details: jsonb("details"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxComponent: index("idx_health_checks_component").on(table.component),
    idxCheckedAt: index("idx_health_checks_checked_at").on(table.checkedAt),
  }),
);
