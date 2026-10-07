import { relations } from "drizzle-orm";
import { offboardingClearances, offboardingSettlementLinks } from "./tables";
import { boardingProcesses } from "../onboarding/tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const offboardingClearancesRelations = relations(
  offboardingClearances,
  ({ one }) => ({
    process: one(boardingProcesses, {
      fields: [offboardingClearances.processId],
      references: [boardingProcesses.id],
    }),
    decidedByUser: one(users, {
      fields: [offboardingClearances.decidedByUserId],
      references: [users.id],
    }),
  }),
);

export const offboardingSettlementLinksRelations = relations(
  offboardingSettlementLinks,
  ({ one }) => ({
    process: one(boardingProcesses, {
      fields: [offboardingSettlementLinks.processId],
      references: [boardingProcesses.id],
    }),
    employee: one(employees, {
      fields: [offboardingSettlementLinks.employeeId],
      references: [employees.id],
    }),
  }),
);
