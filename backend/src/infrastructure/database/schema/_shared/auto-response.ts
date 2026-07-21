import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

/** Auto-response rules: anomaly type → action mapping */
export const autoResponseRules = pgTable(
  "auto_response_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    anomalyType: text("anomaly_type").notNull(),
    minSeverity: text("min_severity").notNull().default("warning"),
    actionType: text("action_type").notNull(),
    actionConfig: jsonb("action_config").$type<Record<string, unknown>>().default({}),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(300),
    maxActionsPerHour: integer("max_actions_per_hour").notNull().default(5),
    isEnabled: boolean("is_enabled").notNull().default(true),
    dryRun: boolean("dry_run").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxAnomalyType: index("idx_auto_response_rules_anomaly_type").on(t.anomalyType),
    idxEnabled: index("idx_auto_response_rules_enabled").on(t.isEnabled),
  }),
);

/** Audit trail for every auto-action executed */
export const autoResponseAuditLog = pgTable(
  "auto_response_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleId: uuid("rule_id").notNull(),
    anomalyType: text("anomaly_type").notNull(),
    severity: text("severity").notNull(),
    actionType: text("action_type").notNull(),
    actionPayload: jsonb("action_payload").$type<Record<string, unknown>>(),
    result: text("result").notNull(), // 'executed' | 'skipped_dry_run' | 'skipped_cooldown' | 'skipped_rate_limit' | 'failed'
    error: text("error"),
    anomalySnapshot: jsonb("anomaly_snapshot").$type<Record<string, unknown>>(),
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxRule: index("idx_auto_response_audit_rule_id").on(t.ruleId),
    idxExecuted: index("idx_auto_response_audit_executed_at").on(t.executedAt),
  }),
);
