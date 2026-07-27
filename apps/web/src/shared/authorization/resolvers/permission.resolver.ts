import type { AuthorizationRule } from '../types/authorization.types';

const ROOT_PERMISSIONS = ['sys:all', 'ALL'];

/**
 * Evaluates an authorization rule against user permissions.
 * v1.x Contract:
 * - Level 0: Super-Admin Root Privilege Bypass (sys:all)
 * - Level 1: Standard Exact Matching for anyOf / allOf
 */
export function evaluatePermissionRule(
  rule: AuthorizationRule | undefined,
  userPermissions: readonly string[] | null | undefined,
): boolean {
  if (!rule) return false;

  const granted = userPermissions ?? [];

  // Super-Admin Bypass
  if (ROOT_PERMISSIONS.some((r) => granted.includes(r))) {
    return true;
  }

  // Exact Match for allOf
  if (rule.allOf && rule.allOf.length > 0) {
    const hasAll = rule.allOf.every((p) => granted.includes(p));
    if (!hasAll) return false;
  }

  // Exact Match for anyOf
  if (rule.anyOf && rule.anyOf.length > 0) {
    const hasAny = rule.anyOf.some((p) => granted.includes(p));
    if (!hasAny) return false;
  }

  return true;
}
