import type { AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";
import { BenefitsPolicies } from "./benefits.policy";
import { ExpensesPolicies } from "./expenses.policy";
import { LearningPolicies } from "./learning.policy";
import { PerformancePolicies } from "./performance.policy";

function makeUser(permissions: string[] = [], isSuperAdmin = false): AuthUser {
  return {
    id: "user-1",
    username: "testuser",
    departmentId: null,
    permissions,
    roles: [],
    isSuperAdmin,
  };
}

describe("Domain Policies Security Verification", () => {
  describe("BenefitsPolicies", () => {
    it("denies access when user has no benefits permissions", () => {
      const user = makeUser([]);
      expect(BenefitsPolicies.access.handle(user)).toBe(false);
      expect(BenefitsPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access with benefits:view", () => {
      const user = makeUser([Permissions.BENEFITS_VIEW]);
      expect(BenefitsPolicies.access.handle(user)).toBe(true);
      expect(BenefitsPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access and manage with benefits:manage", () => {
      const user = makeUser([Permissions.BENEFITS_MANAGE]);
      expect(BenefitsPolicies.access.handle(user)).toBe(true);
      expect(BenefitsPolicies.manage.handle(user)).toBe(true);
    });

    it("allows access for super admin or sys:all", () => {
      expect(BenefitsPolicies.access.handle(makeUser([], true))).toBe(true);
      expect(BenefitsPolicies.access.handle(makeUser([Permissions.SYS_ALL]))).toBe(true);
    });
  });

  describe("ExpensesPolicies", () => {
    it("denies access when user has no expenses permissions", () => {
      const user = makeUser([]);
      expect(ExpensesPolicies.access.handle(user)).toBe(false);
      expect(ExpensesPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access with expenses:view", () => {
      const user = makeUser([Permissions.EXPENSES_VIEW]);
      expect(ExpensesPolicies.access.handle(user)).toBe(true);
      expect(ExpensesPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access and manage with expenses:manage", () => {
      const user = makeUser([Permissions.EXPENSES_MANAGE]);
      expect(ExpensesPolicies.access.handle(user)).toBe(true);
      expect(ExpensesPolicies.manage.handle(user)).toBe(true);
    });
  });

  describe("LearningPolicies", () => {
    it("denies access when user has no learning permissions", () => {
      const user = makeUser([]);
      expect(LearningPolicies.access.handle(user)).toBe(false);
      expect(LearningPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access with learning:view", () => {
      const user = makeUser([Permissions.LEARNING_VIEW]);
      expect(LearningPolicies.access.handle(user)).toBe(true);
      expect(LearningPolicies.manage.handle(user)).toBe(false);
    });

    it("allows access and manage with learning:manage", () => {
      const user = makeUser([Permissions.LEARNING_MANAGE]);
      expect(LearningPolicies.access.handle(user)).toBe(true);
      expect(LearningPolicies.manage.handle(user)).toBe(true);
    });
  });

  describe("PerformancePolicies", () => {
    it("denies access when user has no performance permissions", () => {
      const user = makeUser([]);
      expect(PerformancePolicies.access.handle(user)).toBe(false);
      expect(PerformancePolicies.manage.handle(user)).toBe(false);
    });

    it("allows access with performance:view", () => {
      const user = makeUser([Permissions.PERFORMANCE_VIEW]);
      expect(PerformancePolicies.access.handle(user)).toBe(true);
      expect(PerformancePolicies.manage.handle(user)).toBe(false);
    });

    it("allows access and manage with performance:manage", () => {
      const user = makeUser([Permissions.PERFORMANCE_MANAGE]);
      expect(PerformancePolicies.access.handle(user)).toBe(true);
      expect(PerformancePolicies.manage.handle(user)).toBe(true);
    });
  });
});
