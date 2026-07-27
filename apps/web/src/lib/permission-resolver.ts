/**
 * Compound permission checker.
 * Hierarchy-aware — delegates to @project/permissions.
 *
 * Supports anyOf (OR), allOf (AND), not (NOT) compositions.
 *
 * Usage:
 *   can({ anyOf: [employee.view, employee.manage] })
 *   can({ allOf: [employee.view, payroll.view], not: [employee.suspended] })
 */
import { hasAnyPermission, hasAllPermissions, type PermissionedUser } from '@project/permissions';
import { SUPER_ADMIN_CODES } from './rbac';

export interface PermissionRule {
  anyOf?: readonly string[];
  allOf?: readonly string[];
  not?: readonly string[];
}

function isSuper(user: PermissionedUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return SUPER_ADMIN_CODES.some((c) => (user.permissions ?? []).includes(c));
}

/**
 * Resolve compound permission rule against a user.
 * All conditions must be satisfied (anyOf ∩ allOf ∩ not).
 */
export function can(
  user: PermissionedUser | null | undefined,
  rule: PermissionRule,
): boolean {
  if (isSuper(user)) return true;
  const perms = user?.permissions ?? [];
  if (!perms.length && !isSuper(user)) {
    // If rule has not-condition, still evaluate it
    if (rule.not?.length) {
      // User has no permissions → definitely doesn't have the negated ones
      // not: [...] is satisfied
    } else {
      return false;
    }
  }

  // not: none of these must be present
  if (rule.not?.length) {
    if (hasAnyPermission(perms, [...rule.not], false)) return false;
  }

  // anyOf: at least one must match
  if (rule.anyOf?.length) {
    if (!hasAnyPermission(perms, [...rule.anyOf], false)) return false;
  }

  // allOf: every one must match
  if (rule.allOf?.length) {
    if (!hasAllPermissions(perms, [...rule.allOf], false)) return false;
  }

  return true;
}

/**
 * Flatten rule to a display label (for debugging / PermissionGate).
 */
export function ruleLabel(rule: PermissionRule): string {
  const parts: string[] = [];
  if (rule.anyOf?.length) parts.push(`anyOf(${rule.anyOf.join(',')})`);
  if (rule.allOf?.length) parts.push(`allOf(${rule.allOf.join(',')})`);
  if (rule.not?.length) parts.push(`not(${rule.not.join(',')})`);
  return parts.join(' ') || 'no-permission';
}
