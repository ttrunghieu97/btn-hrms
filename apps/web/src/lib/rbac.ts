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
  return user?.permissions?.includes('sys:all') ?? false;
}

/** Hierarchy-aware permission check. */
export function hasPermission(
  user: PermissionedUser | null | undefined,
  perm: string,
): boolean {
  return hierarchyCheck(user?.permissions ?? [], perm);
}

/** Hierarchy-aware anyOf. */
export function anyOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  return hierarchyAnyOf(user?.permissions ?? [], perms);
}

/** Hierarchy-aware allOf. */
export function allOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  return hierarchyAllOf(user?.permissions ?? [], perms);
}
