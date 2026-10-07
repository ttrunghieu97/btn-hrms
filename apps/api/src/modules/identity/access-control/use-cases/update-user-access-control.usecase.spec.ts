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
    authRepo = {
      revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined),
      findUserById: jest.fn().mockResolvedValue({
        id: "user-1",
        username: "test.user",
        isSuperAdmin: false,
      }),
    } as any;
    accessControlRepo = {
      replaceUserAccessControl: jest.fn().mockResolvedValue(undefined),
      updateUserSuperAdminStatus: jest.fn().mockResolvedValue(undefined),
      findRolesByIds: jest.fn().mockResolvedValue([]),
    } as any;
    requestContext = {
      get: jest.fn(() => ({ userId: "admin-actor", isSuperAdmin: true })),
      getTraceId: jest.fn(() => "trace-test"),
    } as any;
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
    requestContext.get.mockReturnValue({ userId: "admin-actor", isSuperAdmin: false } as any);

    await expect(
      useCase.execute("user-1", ["role-1"], ["employees.read"], true),
    ).rejects.toThrow("Only super administrators can promote or demote system administrators.");
  });

  it("allows superadmin to promote another user to superadmin status", async () => {
    requestContext.get.mockReturnValue({ userId: "super-admin-actor", isSuperAdmin: true } as any);

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

  // ─── Negative Security Tests ───────────────────────────────────────────────

  it("SECURITY: blocks self-escalation when actor attempts to modify own access control", async () => {
    requestContext.get.mockReturnValue({ userId: "user-1", isSuperAdmin: false } as any);

    await expect(
      useCase.execute("user-1", ["admin-role"], ["sys:all"]),
    ).rejects.toThrow("You cannot modify your own access control or permissions.");

    expect(accessControlRepo.replaceUserAccessControl).not.toHaveBeenCalled();
  });

  it("SECURITY: non-superadmin cannot grant sys:all permissions to any user", async () => {
    requestContext.get.mockReturnValue({ userId: "hr-manager", isSuperAdmin: false } as any);

    await expect(
      useCase.execute("user-1", ["role-1"], ["sys:all"]),
    ).rejects.toThrow("Only super administrators can grant system administrator permissions.");

    await expect(
      useCase.execute("user-1", ["role-1"], ["ALL"]),
    ).rejects.toThrow("Only super administrators can grant system administrator permissions.");

    expect(accessControlRepo.replaceUserAccessControl).not.toHaveBeenCalled();
  });

  it("SECURITY: non-superadmin cannot assign system administrator roles", async () => {
    requestContext.get.mockReturnValue({ userId: "hr-manager", isSuperAdmin: false } as any);
    accessControlRepo.findRolesByIds.mockResolvedValue([
      { id: "role-sys", code: "super_admin", isSystem: true } as any,
    ]);

    await expect(
      useCase.execute("user-1", ["role-sys"], ["employees.read"]),
    ).rejects.toThrow("Only super administrators can assign system administrator roles.");

    expect(accessControlRepo.replaceUserAccessControl).not.toHaveBeenCalled();
  });

  it("SECURITY: non-superadmin cannot modify access control of an existing super-admin user", async () => {
    requestContext.get.mockReturnValue({ userId: "hr-manager", isSuperAdmin: false } as any);
    authRepo.findUserById.mockResolvedValue({
      id: "super-user-1",
      username: "root.admin",
      isSuperAdmin: true,
    } as any);

    await expect(
      useCase.execute("super-user-1", ["role-1"], ["employees.read"]),
    ).rejects.toThrow("Only super administrators can modify access control of a super administrator.");

    expect(accessControlRepo.replaceUserAccessControl).not.toHaveBeenCalled();
  });
});
