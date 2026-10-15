import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { violationSeverityEnum, violationStatusEnum } from "./enums";
import { employees } from "../workforce/tables";
import { attendanceSessions } from "../attendance/tables";

export const attendanceViolations = pgTable(
  "attendance_violations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    sessionId: uuid("session_id")
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    code: text("code").notNull(), // e.g. LATE_ARRIVAL, EARLY_DEPARTURE, MISSING_CHECK_OUT, ABSENT, UNSCHEDULED_ATTENDANCE, OVERTIME

    severity: violationSeverityEnum("severity").notNull(),
    status: violationStatusEnum("status").default("OPEN").notNull(),

    autoResolvable: boolean("auto_resolvable").default(false).notNull(),
    requiresApproval: boolean("requires_approval").default(false).notNull(),

    detectedAt: timestamp("detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    metadata: jsonb("metadata"), // e.g. { minutesLate: 15 }

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxSession: index("idx_attendance_violations_session").on(table.sessionId),
    idxEmployee: index("idx_attendance_violations_employee").on(table.employeeId),
    idxStatus: index("idx_attendance_violations_status").on(table.status),
    idxCode: index("idx_attendance_violations_code").on(table.code),
    uqSessionEmployeeCode: uniqueIndex(
      "uq_attendance_violations_session_emp_code",
    )
      .on(table.employeeId, table.sessionId, table.code)
      .where(sql`${table.sessionId} is not null`),
    uqNullSessionDedup: uniqueIndex(
      "uq_attendance_violations_null_session_dedup",
    )
      .on(
        table.employeeId,
        table.code,
        sql`coalesce(${table.metadata}->>'dedupKey', ${table.metadata}->>'date', '')`,
      )
      .where(sql`${table.sessionId} is null`),
  }),
);
