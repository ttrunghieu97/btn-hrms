import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class BenefitsAccessPolicyHandler implements PolicyHandler {
  readonly policyName = "BenefitsAccess";
  readonly requiredAnyOfPermissions = [Permissions.BENEFITS_VIEW, Permissions.BENEFITS_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.BENEFITS_VIEW, Permissions.BENEFITS_MANAGE);
  }
}

class BenefitsManagePolicyHandler implements PolicyHandler {
  readonly policyName = "BenefitsManage";
  readonly requiredAnyOfPermissions = [Permissions.BENEFITS_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.BENEFITS_MANAGE);
  }
}

export const BenefitsPolicies = {
  access: new BenefitsAccessPolicyHandler(),
  manage: new BenefitsManagePolicyHandler(),
} satisfies Record<string, PolicyHandler>;
