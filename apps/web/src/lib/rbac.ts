/**
 * RBAC helpers — hierarchy-aware via shared `@project/permissions`.
 *
 * Thin wrapper that accepts the `PermissionedUser` shape (user object with
 * `permissions[]`). All hierarchy logic, including `sys:all` root permission,
 * is handled by the shared resolver.
 */
import {
  hasPermission as hierarchyCheck,
  hasAnyPermission as hierarchyAnyOf,
  hasAllPermissions as hierarchyAllOf,
} from '@project/permissions';

export interface PermissionedUser {
  permissions?: string[];
  isSuperAdmin?: boolean;
}

/** Check if user has `sys:all` — the root permission. */
export function isSuperAdmin(user: PermissionedUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions?.includes('sys:all') || user.permissions?.includes('ALL') || false;
}

/** Hierarchy-aware permission check. */
export function hasPermission(
  user: PermissionedUser | null | undefined,
  perm: string,
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const perms = user.permissions ?? [];
  if (hierarchyCheck(perms, perm)) return true;

  // Normalize plural/singular permissions (e.g., employees:view:self vs employee:view:self)
  const normalizedPerm = perm.replace(/^employees:/, 'employee:');
  const normalizedPerms = perms.map((p) => p.replace(/^employees:/, 'employee:'));
  if (hierarchyCheck(normalizedPerms, normalizedPerm)) return true;

  // Implied boundary checks: domain:manage implies domain:view or domain:*
  const [domain] = perm.split(':');
  if (domain) {
    const rootDomain = domain.endsWith('s') ? domain.slice(0, -1) : domain;
    if (
      perms.includes(`${domain}:manage`) ||
      perms.includes(`${domain}s:manage`) ||
      perms.includes(`${rootDomain}:manage`) ||
      normalizedPerms.includes(`${rootDomain}:manage`)
    ) {
      return true;
    }
  }
  return false;
}

/** Hierarchy-aware anyOf. */
export function anyOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return perms.some((p) => hasPermission(user, p));
}

/** Hierarchy-aware allOf. */
export function allOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return perms.every((p) => hasPermission(user, p));
}
