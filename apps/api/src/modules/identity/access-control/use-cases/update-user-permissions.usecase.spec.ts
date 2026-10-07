import type { AuthRepository } from "../../auth/repositories/auth.repository";
import type { PermissionCacheService } from "../../permissions/permission-cache.service";
import type { PermissionsRepository } from "../../permissions/repositories/permissions.repository";
import { UpdateUserPermissionsUseCase } from "./update-user-permissions.usecase";

describe("UpdateUserPermissionsUseCase", () => {
  function makeUseCase(overrides: { actorUserId?: string; isSuperAdmin?: boolean } = {}) {
    const calls: string[] = [];
    const tx = {};
    const permissionsRepo = {
      replaceUserPermissions: jest.fn().mockImplementation(async () => {
        calls.push("replace");
      }),
    } as unknown as PermissionsRepository;
    const permissionCache = {
      invalidate: jest.fn().mockImplementation(async () => {
        calls.push("invalidate");
      }),
    } as unknown as PermissionCacheService;
    const authRepo = {
      transaction: jest.fn().mockImplementation(async (handler) => handler(tx)),
      revokeAllRefreshTokens: jest.fn().mockImplementation(async () => {
        calls.push("revoke");
      }),
      findUserById: jest.fn().mockResolvedValue({
        id: "user-1",
        username: "test.user",
        isSuperAdmin: false,
      }),
    } as unknown as AuthRepository;
    const requestContext = {
      get: jest.fn(() => ({
        userId: overrides.actorUserId ?? "admin-user",
        isSuperAdmin: overrides.isSuperAdmin ?? true,
      })),
      getTraceId: jest.fn(() => "trace-test"),
    } as any;

    const useCase = new UpdateUserPermissionsUseCase(
      permissionsRepo,
      permissionCache,
      authRepo,
      requestContext,
    );
    return { useCase, permissionsRepo, permissionCache, authRepo, calls, tx };
  }

  it("replaces permissions atomically before invalidating access state", async () => {
    const { useCase, permissionsRepo, calls, tx } = makeUseCase();

    await expect(
      useCase.execute("user-1", ["employees:view", "employees:edit"]),
    ).resolves.toEqual(["employees:view", "employees:edit"]);

    expect(permissionsRepo.replaceUserPermissions).toHaveBeenCalledWith(
      "user-1",
      ["employees:view", "employees:edit"],
      tx,
    );
    expect(calls).toEqual(["replace", "invalidate", "revoke"]);
  });

  it("SECURITY: blocks self-escalation when actor attempts to modify own permissions", async () => {
    const { useCase } = makeUseCase({ actorUserId: "user-1", isSuperAdmin: false });

    await expect(
      useCase.execute("user-1", ["sys:all"]),
    ).rejects.toThrow("You cannot modify your own permissions.");
  });

  it("SECURITY: non-superadmin cannot grant sys:all permissions", async () => {
    const { useCase } = makeUseCase({ actorUserId: "hr-admin", isSuperAdmin: false });

    await expect(
      useCase.execute("user-1", ["sys:all"]),
    ).rejects.toThrow("Only super administrators can grant system administrator permissions.");
  });

  it("SECURITY: non-superadmin cannot modify permissions of a super administrator", async () => {
    const { useCase, authRepo } = makeUseCase({ actorUserId: "hr-admin", isSuperAdmin: false });
    (authRepo as any).findUserById.mockResolvedValue({
      id: "super-user",
      username: "root",
      isSuperAdmin: true,
    });

    await expect(
      useCase.execute("super-user", ["employees:view"]),
    ).rejects.toThrow("Only super administrators can modify permissions of a super administrator.");
  });
});
