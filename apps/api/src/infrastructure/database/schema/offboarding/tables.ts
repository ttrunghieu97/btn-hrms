import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { boardingProcesses } from "../onboarding/tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";
import { clearanceDepartmentEnum, clearanceDecisionEnum, settlementStatusEnum } from "./enums";

export const offboardingClearances = pgTable(
  "offboarding_clearances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => boardingProcesses.id, { onDelete: "cascade" }),
    department: clearanceDepartmentEnum("department").notNull(),
    decision: clearanceDecisionEnum("decision").default("pending").notNull(),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
    note: text("note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxProcess: index("idx_offboarding_clearances_process").on(table.processId),
    idxDepartment: index("idx_offboarding_clearances_department").on(table.department),
    uniqProcessDepartment: uniqueIndex("uniq_offboarding_clearances_process_department").on(
      table.processId,
      table.department,
    ),
  }),
);

export const offboardingSettlementLinks = pgTable(
  "offboarding_settlement_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => boardingProcesses.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: settlementStatusEnum("status").default("pending").notNull(),
    payrollRef: varchar("payroll_ref", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxProcess: index("idx_offboarding_settlement_links_process").on(table.processId),
    idxEmployee: index("idx_offboarding_settlement_links_employee").on(table.employeeId),
    uniqProcess: uniqueIndex("uniq_offboarding_settlement_links_process").on(table.processId),
  }),
);
