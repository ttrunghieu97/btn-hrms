import type { Cache } from "cache-manager";
import type { RequestContextService } from "../../../shared/context/request-context.service";
import type { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.usecase";
import { PermissionCacheService } from "./permission-cache.service";

describe("PermissionCacheService", () => {
  it("falls back to authoritative permissions when cache reads fail", async () => {
    const cache = {
      get: jest.fn().mockRejectedValue(new Error("redis unavailable")),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as Cache;
    const getUserPermissions = {
      execute: jest.fn().mockResolvedValue(["employees:view"]),
    } as unknown as GetUserPermissionsUseCase;
    const service = new PermissionCacheService(
      cache,
      getUserPermissions,
      { get: jest.fn() } as unknown as RequestContextService,
    );

    await expect(service.getPermissions("user-1")).resolves.toEqual([
      "employees:view",
    ]);
    expect(getUserPermissions.execute).toHaveBeenCalledWith("user-1");
    expect(cache.set).toHaveBeenCalledWith(
      "perm:user:user-1",
      ["employees:view"],
      1800,
    );
  });

  it("keeps invalidation best-effort when cache deletion fails", async () => {
    const cache = {
      del: jest.fn().mockRejectedValue("redis unavailable"),
    } as unknown as Cache;
    const service = new PermissionCacheService(
      cache,
      { execute: jest.fn() } as unknown as GetUserPermissionsUseCase,
      { get: jest.fn() } as unknown as RequestContextService,
    );

    await expect(service.invalidate("user-1")).resolves.toBeUndefined();
  });
});
