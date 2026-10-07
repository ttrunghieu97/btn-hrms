/**
 * Compound permission checker.
 * Hierarchy-aware — delegates to @project/permissions.
 *
 * Supports anyOf (OR), allOf (AND), not (NOT) compositions.
 * `sys:all` root permission handled by the resolver, not here.
 *
 * Usage:
 *   can({ anyOf: [employee.view, employee.manage] })
 *   can({ allOf: [employee.view, payroll.view], not: [employee.suspended] })
 */
import { hasAnyPermission, hasAllPermissions } from '@project/permissions';
import type { PermissionedUser } from './rbac';

export interface PermissionRule {
  anyOf?: readonly string[];
  allOf?: readonly string[];
  not?: readonly string[];
}

/**
 * Resolve compound permission rule against a user.
 * Delegates permission checking to @project/permissions (hierarchy-aware,
 * sys:all root).
 */
export function can(
  user: PermissionedUser | null | undefined,
  rule: PermissionRule,
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const perms = user?.permissions ?? [];

  if (!rule.anyOf?.length && !rule.allOf?.length && !rule.not?.length) return false;

  // not: none of these must be present
  if (rule.not?.length) {
    if (hasAnyPermission(perms, [...rule.not])) return false;
  }

  // anyOf: at least one must match
  if (rule.anyOf?.length) {
    if (!hasAnyPermission(perms, [...rule.anyOf])) return false;
  }

  // allOf: every one must match
  if (rule.allOf?.length) {
    if (!hasAllPermissions(perms, [...rule.allOf])) return false;
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
