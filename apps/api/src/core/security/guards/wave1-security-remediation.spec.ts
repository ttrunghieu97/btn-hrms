import { ForbiddenException, BadRequestException } from "@nestjs/common";
import { UpdateRoleUseCase } from "../../../modules/identity/roles/use-cases/update-role.usecase";
import { RolesRepository as CoreRolesRepository } from "../roles/roles.repository";
import { StorageUrlService } from "../../../infrastructure/storage/storage-url.service";
import { StorageConfigService } from "../../../infrastructure/storage/storage-config.service";
import { MultipartInitUseCase } from "../../../modules/storage/use-cases/multipart-init.usecase";
import { MultipartCompleteUseCase } from "../../../modules/storage/use-cases/multipart-complete.usecase";
import { UserOrIpThrottlerGuard } from "./user-or-ip-throttler.guard";

describe("Wave 1 Security Remediation Regression Suite", () => {
  describe("AUDIT-001: UpdateRoleUseCase self-role escalation & privilege ceiling", () => {
    const makeUpdateRole = (ctx: any, assignedUserIds: string[]) => {
      const rolesRepo = {
        findById: jest.fn().mockResolvedValue({
          id: "role-1",
          code: "hr_admin",
          name: "HR Admin",
          isSystem: false,
          permissions: ["employees:view"],
        }),
        findUserIdsWithRole: jest.fn().mockResolvedValue(assignedUserIds),
        update: jest.fn(),
      } as any;
      const requestContext = {
        get: jest.fn().mockReturnValue(ctx),
        getTraceId: jest.fn().mockReturnValue("trace-w1"),
      } as any;
      const scopedDb = {
        getDb: jest.fn().mockReturnValue({
          transaction: jest.fn((cb) => cb({})),
        }),
      } as any;
      const permCache = { invalidateMany: jest.fn() } as any;
      const authRepo = { revokeAllRefreshTokens: jest.fn() } as any;
      const auditLog = { write: jest.fn() } as any;
      const authVersion = { bumpMany: jest.fn() } as any;

      return {
        useCase: new UpdateRoleUseCase(
          rolesRepo,
          requestContext,
          scopedDb,
          permCache,
          authRepo,
          auditLog,
          authVersion,
        ),
        rolesRepo,
        auditLog,
      };
    };

    it("blocks a non-superadmin from modifying permissions of a role assigned to themselves", async () => {
      const { useCase, rolesRepo, auditLog } = makeUpdateRole(
        {
          userId: "actor-1",
          isSuperAdmin: false,
          permissions: ["roles:manage", "employees:view", "employees:edit"],
        },
        ["actor-1", "other-user"],
      );

      await expect(
        useCase.execute("role-1", { permissions: ["employees:view", "employees:edit"] }),
      ).rejects.toThrow(ForbiddenException);

      expect(rolesRepo.update).not.toHaveBeenCalled();
      expect(auditLog.write).toHaveBeenCalledWith(
        expect.objectContaining({ result: "FAILED", action: "ROLE_UPDATE_FAILED" }),
      );
    });

    it("blocks a non-superadmin from adding permissions they do not possess to another role", async () => {
      const { useCase, rolesRepo } = makeUpdateRole(
        {
          userId: "actor-1",
          isSuperAdmin: false,
          permissions: ["roles:manage", "employees:view"],
        },
        ["other-user"],
      );

      await expect(
        useCase.execute("role-1", { permissions: ["employees:view", "payroll:manage"] }),
      ).rejects.toThrow(ForbiddenException);

      expect(rolesRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("AUDIT-003: Core RolesRepository filters out explicit access_denials", () => {
    it("excludes denied permission codes from roleContext.permissions", async () => {
      let callCount = 0;
      const mockDb = {
        select: jest.fn(() => {
          callCount += 1;
          if (callCount === 1) {
            return {
              from: () => ({
                innerJoin: () => ({
                  leftJoin: () => ({
                    where: () =>
                      Promise.resolve([
                        { roleName: "Employee", permissionCode: "employees:view:self" },
                        { roleName: "Employee", permissionCode: "leave:create" },
                      ]),
                  }),
                }),
              }),
            };
          }
          return {
            from: () => ({
              where: () => Promise.resolve([{ permissionCode: "leave:create" }]),
            }),
          };
        }),
      } as any;

      const repo = new CoreRolesRepository(mockDb, { invalidate: jest.fn() } as any);
      const ctx = await repo.findRoleContextByUserId("user-1");

      expect(ctx.roleNames).toEqual(["Employee"]);
      expect(ctx.permissions).toEqual(["employees:view:self"]);
      expect(ctx.permissions).not.toContain("leave:create");
    });
  });

  describe("AUDIT-004: StorageUrlService never returns unauthenticated /public/ paths", () => {
    it("returns /files/<key> even when STORAGE_BACKEND is local", () => {
      const config = {
        get: jest.fn((k: string) => (k === "STORAGE_BACKEND" ? "local" : undefined)),
      } as any;
      const storageConfig = new StorageConfigService(config);
      const urlService = new StorageUrlService(storageConfig);

      expect(urlService.getUrl("employees/emp-1/contract.pdf")).toBe(
        "/files/employees/emp-1/contract.pdf",
      );
    });
  });

  describe("AUDIT-016: MultipartInitUseCase & MultipartCompleteUseCase security & size threshold", () => {
    it("allows 60MB document multipart upload and enforces actor ownership", async () => {
      const storage = {
        isS3: jest.fn().mockReturnValue(true),
        createMultipartUpload: jest.fn().mockResolvedValue("upload-123"),
        getPresignedPartUrls: jest.fn().mockResolvedValue(["https://s3/part1"]),
        insertPendingUploadRecord: jest.fn().mockResolvedValue(undefined),
      } as any;
      const config = { get: jest.fn().mockReturnValue(undefined) } as any;
      const requestContext = {
        get: jest.fn().mockReturnValue({
          userId: "user-1",
          employeeId: "emp-1",
          isSuperAdmin: false,
          permissions: ["files:upload"],
        }),
      } as any;

      const initUseCase = new MultipartInitUseCase(storage, config, requestContext);

      // Cross-employee upload without management permission must be blocked
      await expect(
        initUseCase.execute({
          purpose: "document",
          ownerType: "employee",
          ownerId: "emp-other",
          mimeType: "application/pdf",
          fileName: "large.pdf",
          size: 60 * 1024 * 1024,
          uploadedBy: "user-1",
        }),
      ).rejects.toThrow(ForbiddenException);

      // Self-employee 60MB upload succeeds
      const res = await initUseCase.execute({
        purpose: "document",
        ownerType: "employee",
        ownerId: "emp-1",
        mimeType: "application/pdf",
        fileName: "large.pdf",
        size: 60 * 1024 * 1024,
        uploadedBy: "user-1",
      });
      expect(res.uploadId).toBe("upload-123");
      expect(res.key).toMatch(/^uploads\/employees\/emp-1\//);

      // Avatar multipart upload is rejected
      await expect(
        initUseCase.execute({
          purpose: "avatar",
          ownerType: "employee",
          ownerId: "emp-1",
          mimeType: "image/png",
          fileName: "avatar.png",
          size: 60 * 1024 * 1024,
          uploadedBy: "user-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("blocks completing a multipart upload initiated by another user", async () => {
      const storage = {
        getFileById: jest.fn().mockResolvedValue({
          id: "file-1",
          key: "uploads/employees/emp-1/file-1.pdf",
          purpose: "document",
          status: "pending_upload",
          uploadedBy: "user-owner",
        }),
        completeMultipartUpload: jest.fn(),
      } as any;
      const requestContext = {
        get: jest.fn().mockReturnValue({
          userId: "user-attacker",
          isSuperAdmin: false,
        }),
      } as any;

      const completeUseCase = new MultipartCompleteUseCase(
        storage,
        { enqueue: jest.fn() } as any,
        { enqueue: jest.fn() } as any,
        {} as any,
        requestContext,
      );

      await expect(
        completeUseCase.execute({
          fileId: "file-1",
          uploadId: "upload-1",
          parts: [{ partNumber: 1, etag: '"etag1"' }],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(storage.completeMultipartUpload).not.toHaveBeenCalled();
    });
  });

  describe("AUDIT-032: UserOrIpThrottlerGuard client IP extraction behind Cloudflare/Caddy", () => {
    it("prefers cf-connecting-ip and x-real-ip over proxy remote address", async () => {
      const guard = Object.create(UserOrIpThrottlerGuard.prototype) as UserOrIpThrottlerGuard;
      const getTracker = (guard as any).getTracker.bind(guard);

      await expect(
        getTracker({
          headers: { "cf-connecting-ip": "203.0.113.42" },
          ip: "172.18.0.5",
        }),
      ).resolves.toBe("ip:203.0.113.42");

      await expect(
        getTracker({
          headers: { "x-real-ip": "198.51.100.17" },
          ip: "172.18.0.5",
        }),
      ).resolves.toBe("ip:198.51.100.17");

      await expect(
        getTracker({
          user: { id: "user-99" },
          headers: { "cf-connecting-ip": "203.0.113.42" },
          ip: "172.18.0.5",
        }),
      ).resolves.toBe("user:user-99");
    });
  });
});
