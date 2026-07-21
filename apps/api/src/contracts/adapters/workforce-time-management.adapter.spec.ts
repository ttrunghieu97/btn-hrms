import { WorkforceTimeManagementAdapter } from "./workforce-time-management.adapter";

import type { WorkforceIdentityAcl } from "../acls/workforce-identity.acl";
import type * as schema from "../../infrastructure/database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

describe("WorkforceTimeManagementAdapter", () => {
  it("returns mapped employee context", async () => {
    const db = {
      query: {
        employees: {
          findFirst: jest.fn().mockResolvedValue({
            id: "emp-1",
            userId: "usr-1",
            departmentId: "dep-1",
            status: "active",
            siteAssignments: [],
          }),
        },
      },
    } as unknown as PostgresJsDatabase<typeof schema>;

    const acl = {
      mapToTimeEligibility: jest.fn().mockReturnValue({
        timeEligibilityStatus: "eligible",
        departmentId: "dep-1",
      }),
    } as unknown as WorkforceIdentityAcl;

    const adapter = new WorkforceTimeManagementAdapter(db, acl);
    const result = await adapter.getEmployeeContext("emp-1");

    expect(result).toEqual({
      employeeId: "emp-1",
      userId: "usr-1",
      departmentId: "dep-1",
      currentSite: null,
      employmentStatus: "eligible",
    });
  });
});
