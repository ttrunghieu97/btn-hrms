import type { AuthRepository } from "../../auth/repositories/auth.repository";
import type { PermissionCacheService } from "../../permissions/permission-cache.service";
import type { PermissionsRepository } from "../../permissions/repositories/permissions.repository";
import { UpdateUserPermissionsUseCase } from "./update-user-permissions.usecase";

describe("UpdateUserPermissionsUseCase", () => {
  it("replaces permissions atomically before invalidating access state", async () => {
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
    } as unknown as AuthRepository;
    const useCase = new UpdateUserPermissionsUseCase(
      permissionsRepo,
      permissionCache,
      authRepo,
    );

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
});
