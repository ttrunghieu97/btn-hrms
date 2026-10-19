import { hasPermission } from '@project/permissions';
import type { AuthorizationRule } from '../types/authorization.types';

/**
 * Evaluates an authorization rule against user permissions.
 * Delegates matching to @project/permissions `hasPermission` so root bypass
 * (`sys:all` / `ALL`), hierarchy (`manage` -> `read`/`write`/etc.), and
 * resource normalization are identical across Edge proxy and SSR/Client.
 */
export function evaluatePermissionRule(
  rule: AuthorizationRule | undefined,
  userPermissions: readonly string[] | null | undefined,
): boolean {
  if (!rule) return false;

  const granted = userPermissions ? Array.from(userPermissions) : [];

  if (rule.allOf && rule.allOf.length > 0) {
    const hasAll = rule.allOf.every((p) => hasPermission(granted, p));
    if (!hasAll) return false;
  }

  if (rule.anyOf && rule.anyOf.length > 0) {
    const hasAny = rule.anyOf.some((p) => hasPermission(granted, p));
    if (!hasAny) return false;
  }

  return true;
}
