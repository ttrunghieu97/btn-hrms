import { relations } from "drizzle-orm";
import { auditLogs } from "./audit-logs";
import { users } from "../identity/tables";

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));
