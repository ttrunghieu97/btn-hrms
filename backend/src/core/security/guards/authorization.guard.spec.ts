import { Test, type TestingModule } from "@nestjs/testing";
import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthorizationGuard } from "./authorization.guard";
import { PolicyEngine } from "../policy-engine/policy.engine";
import { AuthorizationAuditService } from "../auth/authorization-audit.service";
import { type AuthUser } from "../types/auth-user.interface";
import { REQUIRE_PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { CHECK_POLICY_KEY } from "../decorators/check-policy.decorator";
import { type PolicyHandler } from "../policies/policy-handler.interface";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import { Permissions } from "../permissions/permissions.registry";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";

describe("AuthorizationGuard", () => {
  let guard: AuthorizationGuard;
  let reflector: Reflector;
  let auditService: AuthorizationAuditService;
  let testingModule: TestingModule;

  const mockUser: AuthUser = {
    id: "user-1",
    username: "testuser",
    permissions: ["employees:view"],
    roles: ["employee"],
    isSuperAdmin: false,
    departmentId: "dept-1",
  };

  const createMockContext = (user: any, _permissions: string[] | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: {},
        }),
      }),
      getHandler: () => ({ name: "testMethod" }),
      getClass: () => ({ name: "TestController" }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PolicyEngine,
          useValue: {
            evaluate: jest.fn(),
            can: jest.fn((user: AuthUser, permission: string) =>
              (user.permissions ?? []).includes(permission),
            ),
          },
        },
        {
          provide: CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT,
          useValue: {
            load: jest.fn(),
          },
        },
        {
          provide: AuthorizationAuditService,
          useValue: {
            record: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = testingModule.get<AuthorizationGuard>(AuthorizationGuard);
    reflector = testingModule.get<Reflector>(Reflector);
    auditService = testingModule.get<AuthorizationAuditService>(
      AuthorizationAuditService,
    );
  });

  it("should allow access when user has required permission", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === REQUIRE_PERMISSION_KEY) return ["employees:view"];
      return null;
    });

    const mockEngine = testingModule.get<PolicyEngine>(PolicyEngine);
    (mockEngine.evaluate as jest.Mock).mockResolvedValue({
      allowed: true,
      permissionsChecked: ["employees:view"],
    });

    const context = createMockContext(mockUser, ["employees:view"]);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(auditService.record).toHaveBeenCalled();
  });

  it("should throw ForbiddenException when user lacks permission", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === REQUIRE_PERMISSION_KEY) return ["employees:edit"];
      return null;
    });

    const mockEngine = testingModule.get<PolicyEngine>(PolicyEngine);
    (mockEngine.evaluate as jest.Mock).mockResolvedValue({
      allowed: false,
      permissionsChecked: ["employees:edit"],
      decidedBy: "permission_check",
    });

    const context = createMockContext(mockUser, ["employees:view"]);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(auditService.record).toHaveBeenCalled();
  });

  it("should deny access even if AUTH_ENFORCEMENT_ENABLED would have been false before", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === REQUIRE_PERMISSION_KEY) return ["employees:edit"];
      return null;
    });

    const mockEngine = testingModule.get<PolicyEngine>(PolicyEngine);
    (mockEngine.evaluate as jest.Mock).mockResolvedValue({
      allowed: false,
      permissionsChecked: ["employees:edit"],
      decidedBy: "permission_check",
    });

    const context = createMockContext(mockUser, ["employees:view"]);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(auditService.record).toHaveBeenCalled();
  });

  it("should honor permission hierarchy for @RequirePermission checks", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === REQUIRE_PERMISSION_KEY) {
        return [Permissions.ATTENDANCE_VIEW_SELF];
      }
      return null;
    });

    const mockEngine = testingModule.get<PolicyEngine>(PolicyEngine);
    (mockEngine.can as jest.Mock).mockImplementation(
      (user: AuthUser, permission: string) =>
        permission === Permissions.ATTENDANCE_VIEW_SELF
          ? (user.permissions ?? []).includes(
              Permissions.ATTENDANCE_VIEW_DEPARTMENT,
            )
          : (user.permissions ?? []).includes(permission),
    );
    (mockEngine.evaluate as jest.Mock).mockResolvedValue({
      allowed: true,
      permissionsChecked: [Permissions.ATTENDANCE_VIEW_SELF],
    });

    const context = createMockContext(
      {
        ...mockUser,
        permissions: [Permissions.ATTENDANCE_VIEW_DEPARTMENT],
      },
      [Permissions.ATTENDANCE_VIEW_SELF],
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockEngine.evaluate).toHaveBeenCalled();
  });

  describe("Integration with actual PolicyEngine", () => {
    let integrationGuard: AuthorizationGuard;

    beforeEach(async () => {
      const integrationModule = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          PolicyEngine, // Real PolicyEngine
          {
            provide: PermissionHierarchyResolver, // Mock resolver for PolicyEngine
            useValue: {
              satisfies: jest.fn((perms: string[] | undefined, req: string) => (perms || []).includes(req)),
            },
          },
          {
            provide: CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT,
            useValue: { load: jest.fn() },
          },
          {
            provide: AuthorizationAuditService,
            useValue: { record: jest.fn() },
          },
        ],
      }).compile();

      integrationGuard = integrationModule.get<AuthorizationGuard>(AuthorizationGuard);
      reflector = integrationModule.get<Reflector>(Reflector);
      auditService = integrationModule.get<AuthorizationAuditService>(AuthorizationAuditService);
    });

    it("treats sys:all as the only super-admin permission", async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === REQUIRE_PERMISSION_KEY) return [Permissions.EMPLOYEES_MANAGE_SENSITIVE];
        return null;
      });

      const context = createMockContext({
        id: "system-admin",
        permissions: [Permissions.SYS_ALL],
        isSuperAdmin: false,
      }, [Permissions.EMPLOYEES_MANAGE_SENSITIVE]);

      await expect(integrationGuard.canActivate(context)).resolves.toBe(true);
    });

    it("does not treat ALL as a super-admin permission", async () => {
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === REQUIRE_PERMISSION_KEY) return [Permissions.EMPLOYEES_MANAGE_SENSITIVE];
        return null;
      });

      const context = createMockContext({
        id: "legacy-admin",
        permissions: ["ALL"],
        isSuperAdmin: false,
      }, [Permissions.EMPLOYEES_MANAGE_SENSITIVE]);

      await expect(integrationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should deny if user lacks permissions for both @CheckPolicy(A) and @RequirePermission(B)", async () => {
      const customPolicy: PolicyHandler = {
        policyName: "CustomPolicyA",
        requiredAnyOfPermissions: ["permission:A"],
        handle: () => true,
      };

      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === CHECK_POLICY_KEY) return [customPolicy];
        if (key === REQUIRE_PERMISSION_KEY) return ["permission:B"];
        return null;
      });

      const context = createMockContext({
        id: "user-no-perms",
        permissions: [],
        isSuperAdmin: false,
      }, []);

      // Without the policy.engine.ts bug fix, this would have ALLOWED access
      // because both handlers would 'continue' and the engine would return allowed: true.
      await expect(integrationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
