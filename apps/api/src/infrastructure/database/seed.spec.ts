import { PermissionRegistry } from "@project/permissions";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { PERMISSIONS, SYSTEM_ROLES } from "./seed";

describe("Database Seed Permission Synchronization", () => {
  const seededCodes = new Set(PERMISSIONS.map((p) => p.code));

  it("includes every permission code registered in @project/permissions PermissionRegistry", () => {
    const registryCodes = Object.values(PermissionRegistry).flatMap((domain) =>
      Object.values(domain as Record<string, string>),
    );

    const missingFromSeed = registryCodes.filter((code) => !seededCodes.has(code));
    expect(missingFromSeed).toEqual([]);
  });

  it("includes every permission code registered in backend Permissions catalog", () => {
    const apiPermissionCodes = Object.values(Permissions);

    const missingFromSeed = apiPermissionCodes.filter((code) => !seededCodes.has(code));
    expect(missingFromSeed).toEqual([]);
  });

  it("ensures all SYSTEM_ROLES only reference valid seeded permission codes and employee_base has core self-service permissions", () => {
    for (const role of SYSTEM_ROLES) {
      const unknownCodes = role.permissions.filter((code) => !seededCodes.has(code));
      expect(unknownCodes).toEqual([]);
    }

    const employeeBase = SYSTEM_ROLES.find((r) => r.code === "employee_base");
    expect(employeeBase).toBeDefined();
    expect(employeeBase?.permissions).toEqual(
      expect.arrayContaining([
        Permissions.NOTIFICATIONS_VIEW_SELF,
        Permissions.PERFORMANCE_VIEW,
        Permissions.TASKS_VIEW_SELF,
        Permissions.ASSET_VIEW_SELF,
      ]),
    );
  });
});
