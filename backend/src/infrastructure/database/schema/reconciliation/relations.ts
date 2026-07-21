import { relations } from "drizzle-orm";
import { attendanceViolations } from "./tables";
import { attendanceSessions } from "../attendance/tables";
import { employees } from "../workforce/tables";

export const attendanceViolationsRelations = relations(
  attendanceViolations,
  ({ one }) => ({
    session: one(attendanceSessions, {
      fields: [attendanceViolations.sessionId],
      references: [attendanceSessions.id],
    }),
    employee: one(employees, {
      fields: [attendanceViolations.employeeId],
      references: [employees.id],
    }),
  }),
);
