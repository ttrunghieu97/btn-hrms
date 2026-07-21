import { Test, type TestingModule } from "@nestjs/testing";
import { AuthorizationService } from "./authorization.service";
import { PolicyEngine } from "./policy-engine/policy.engine";
import { PermissionHierarchyResolver } from "./permissions/permission-hierarchy.resolver";
import { type AuthUser } from "./types/auth-user.interface";

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let _policyEngine: PolicyEngine;

  const mockUser: AuthUser = {
    id: "user-1",
    username: "testuser",
    permissions: ["employees:view"],
    roles: ["employee"],
    isSuperAdmin: false,
    departmentId: "dept-1",
  };

  const mockAdmin: AuthUser = {
    id: "admin-1",
    username: "admin",
    permissions: ["ALL"],
    roles: ["super_admin"],
    isSuperAdmin: true,
    departmentId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        PolicyEngine,
        PermissionHierarchyResolver,
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    _policyEngine = module.get<PolicyEngine>(PolicyEngine);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("can", () => {
    it("should return true if user has the permission", () => {
      expect(service.can(mockUser, "employees:view")).toBe(true);
    });

    it("should return false if user lacks the permission", () => {
      expect(service.can(mockUser, "employees:edit")).toBe(false);
    });

    it("should return true for super admin with ALL permission", () => {
      expect(service.can(mockAdmin, "any:permission")).toBe(true);
    });
  });

  describe("authorize", () => {
    it("should allow access if user has permission", async () => {
      const result = await service.authorize(mockUser, "employees:view");
      expect(result.allowed).toBe(true);
      expect(result.decidedBy).toBe("permission_check");
    });

    it("should deny access if user lacks permission", async () => {
      const result = await service.authorize(mockUser, "employees:edit");
      expect(result.allowed).toBe(false);
      expect(result.decidedBy).toBe("default_deny");
    });
  });
});
