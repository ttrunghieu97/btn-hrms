import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class LearningAccessPolicyHandler implements PolicyHandler {
  readonly policyName = "LearningAccess";
  readonly requiredAnyOfPermissions = [Permissions.LEARNING_VIEW, Permissions.LEARNING_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.LEARNING_VIEW, Permissions.LEARNING_MANAGE);
  }
}

class LearningManagePolicyHandler implements PolicyHandler {
  readonly policyName = "LearningManage";
  readonly requiredAnyOfPermissions = [Permissions.LEARNING_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.LEARNING_MANAGE);
  }
}

export const LearningPolicies = {
  access: new LearningAccessPolicyHandler(),
  manage: new LearningManagePolicyHandler(),
} satisfies Record<string, PolicyHandler>;
