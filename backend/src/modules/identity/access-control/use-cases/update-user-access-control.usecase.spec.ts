import { UpdateUserAccessControlUseCase } from "./update-user-access-control.usecase";
import { type AccessControlRepository } from "../repositories/access-control.repository";
import { type PermissionCacheService } from "../../permissions/permission-cache.service";
import { type AuthRepository } from "../../auth/repositories/auth.repository";
import { type RequestContextService } from "../../../../shared/context/request-context.service";

describe("UpdateUserAccessControlUseCase", () => {
  let permissionCache: jest.Mocked<PermissionCacheService>;
  let authRepo: jest.Mocked<AuthRepository>;
  let accessControlRepo: jest.Mocked<AccessControlRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let useCase: UpdateUserAccessControlUseCase;

  beforeEach(() => {
    permissionCache = { invalidate: jest.fn().mockResolvedValue(undefined) } as any;
    authRepo = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) } as any;
    accessControlRepo = {
      replaceUserAccessControl: jest.fn().mockResolvedValue(undefined),
      updateUserSuperAdminStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
    requestContext = { get: jest.fn(() => undefined), getTraceId: jest.fn(() => 'trace-test') } as any;
    useCase = new UpdateUserAccessControlUseCase(
      permissionCache,
      authRepo,
      accessControlRepo,
      requestContext,
      { write: jest.fn() },
      { bump: jest.fn().mockResolvedValue(1) } as any,
    );
  });

  it("delegates atomic replacement to repository and clears auth state", async () => {
    await expect(
      useCase.execute("user-1", ["role-1"], ["employees.read"]),
    ).resolves.toEqual({
      roleIds: ["role-1"],
      permissionCodes: ["employees.read"],
      isSuperAdmin: undefined,
    });

    expect(accessControlRepo.replaceUserAccessControl).toHaveBeenCalledWith(
      "user-1",
      ["role-1"],
      ["employees.read"],
    );
    expect(permissionCache.invalidate).toHaveBeenCalledWith("user-1");
    expect(authRepo.revokeAllRefreshTokens).toHaveBeenCalledWith("user-1");
  });

  it("throws forbidden if non-superadmin attempts to modify superadmin status", async () => {
    requestContext.get.mockReturnValue({ isSuperAdmin: false } as any);

    await expect(
      useCase.execute("user-1", ["role-1"], ["employees.read"], true),
    ).rejects.toThrow("Only super administrators can promote or demote system administrators.");
  });

  it("allows superadmin to promote another user to superadmin status", async () => {
    requestContext.get.mockReturnValue({ isSuperAdmin: true } as any);

    await expect(
      useCase.execute("user-1", ["role-1"], ["employees.read"], true),
    ).resolves.toEqual({
      roleIds: ["role-1"],
      permissionCodes: ["employees.read"],
      isSuperAdmin: true,
    });

    expect(accessControlRepo.updateUserSuperAdminStatus).toHaveBeenCalledWith("user-1", true);
    expect(accessControlRepo.replaceUserAccessControl).toHaveBeenCalledWith(
      "user-1",
      ["role-1"],
      ["employees.read"],
    );
  });
});
