import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class PerformanceAccessPolicyHandler implements PolicyHandler {
  readonly policyName = "PerformanceAccess";
  readonly requiredAnyOfPermissions = [Permissions.PERFORMANCE_VIEW, Permissions.PERFORMANCE_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.PERFORMANCE_VIEW, Permissions.PERFORMANCE_MANAGE);
  }
}

class PerformanceManagePolicyHandler implements PolicyHandler {
  readonly policyName = "PerformanceManage";
  readonly requiredAnyOfPermissions = [Permissions.PERFORMANCE_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.PERFORMANCE_MANAGE);
  }
}

export const PerformancePolicies = {
  access: new PerformanceAccessPolicyHandler(),
  manage: new PerformanceManagePolicyHandler(),
} satisfies Record<string, PolicyHandler>;
