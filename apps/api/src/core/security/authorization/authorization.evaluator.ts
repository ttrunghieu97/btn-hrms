import { AUTHORIZATION } from "./authorization.registry";
import type { AuthorizationRule } from "./authorization.types";

const ROOT_PERMISSIONS = ["sys:all", "ALL"];

export function evaluatePermissionRule(
  rule: AuthorizationRule | undefined,
  userPermissions: readonly string[] | null | undefined,
): boolean {
  if (!rule) return false;
  const granted = userPermissions ?? [];

  // Level 0: Super-Admin Root Privilege Bypass (sys:all / ALL)
  if (ROOT_PERMISSIONS.some((r) => granted.includes(r))) {
    return true;
  }

  if (rule.allOf && rule.allOf.length > 0) {
    const hasAll = rule.allOf.every((p) => granted.includes(p));
    if (!hasAll) return false;
  }

  if (rule.anyOf && rule.anyOf.length > 0) {
    const hasAny = rule.anyOf.some((p) => granted.includes(p));
    if (!hasAny) return false;
  }

  return true;
}

export function canAccessRoute(
  route: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const rule = AUTHORIZATION.routes[route];
  if (!rule) return false; // Default-Deny for unregistered routes
  return evaluatePermissionRule(rule, permissions);
}

export function canAccessResource(
  resource: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const rule = AUTHORIZATION.resources[resource];
  if (!rule) return false;
  return evaluatePermissionRule(rule, permissions);
}

export function canPerformAction(
  action: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const rule = AUTHORIZATION.actions[action];
  if (!rule) return false;
  return evaluatePermissionRule(rule, permissions);
}
