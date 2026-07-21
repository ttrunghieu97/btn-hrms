import { TimeManagementPayrollAdapter } from "./time-management-payroll.adapter";

import type { PayrollInputAcl } from "../acls/payroll-input.acl";
import type * as schema from "../../infrastructure/database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

describe("TimeManagementPayrollAdapter", () => {
  it("derives payroll inputs from attendance rows and approved overtime", async () => {
    const db = {
      query: {
        attendances: {
          findMany: jest.fn().mockResolvedValue([
            { type: "check_in", time: new Date("2026-04-01T08:00:00Z") },
            { type: "check_out", time: new Date("2026-04-01T17:00:00Z") },
            { type: "check_in", time: new Date("2026-04-02T08:00:00Z") },
            { type: "check_out", time: new Date("2026-04-02T17:00:00Z") },
          ]),
        },
        employeeShiftAssignments: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    } as unknown as PostgresJsDatabase<typeof schema>;

    const acl = {
      mapTimeSignalsToPayrollInputs: jest
        .fn()
        .mockImplementation(({ workedHours }) => [
          { type: "attendance_hours", quantity: String(workedHours) },
        ]),
    } as unknown as PayrollInputAcl;

    const adapter = new TimeManagementPayrollAdapter(db, acl);
    const result = await adapter.getPayrollInputs({
      employeeId: "emp-1",
      period: "2026-04",
    });

    expect(acl.mapTimeSignalsToPayrollInputs).toHaveBeenCalledWith({
      workedHours: 16,
      overtimeHours: 16,
    });
    expect(result).toEqual([{ type: "attendance_hours", quantity: "16" }]);
  });
});
