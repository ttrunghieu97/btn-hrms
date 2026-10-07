import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class ExpensesAccessPolicyHandler implements PolicyHandler {
  readonly policyName = "ExpensesAccess";
  readonly requiredAnyOfPermissions = [Permissions.EXPENSES_VIEW, Permissions.EXPENSES_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.EXPENSES_VIEW, Permissions.EXPENSES_MANAGE);
  }
}

class ExpensesManagePolicyHandler implements PolicyHandler {
  readonly policyName = "ExpensesManage";
  readonly requiredAnyOfPermissions = [Permissions.EXPENSES_MANAGE];

  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.EXPENSES_MANAGE);
  }
}

export const ExpensesPolicies = {
  access: new ExpensesAccessPolicyHandler(),
  manage: new ExpensesManagePolicyHandler(),
} satisfies Record<string, PolicyHandler>;
