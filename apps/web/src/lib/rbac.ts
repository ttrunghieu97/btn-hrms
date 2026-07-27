/**
 * RBAC helpers — hierarchy-aware via shared `@project/permissions`.
 *
 * Wraps the shared resolver to accept the legacy `PermissionedUser` shape
 * (user object with `permissions[]` and `isSuperAdmin`).
 *
 * Hierarchy: `attendance:view:all` implies `attendance:view:self`.
 */
import {
  hasPermission as hierarchyCheck,
  hasAnyPermission as hierarchyAnyOf,
  hasAllPermissions as hierarchyAllOf,
} from '@project/permissions';

export const SUPER_ADMIN_CODES = ['sys:all', 'ALL'] as const;
export type SuperAdminCode = (typeof SUPER_ADMIN_CODES)[number];

export interface PermissionedUser {
  permissions?: string[];
  isSuperAdmin?: boolean;
}

function isSuper(user: PermissionedUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const perms = user.permissions ?? [];
  return SUPER_ADMIN_CODES.some((c) => perms.includes(c));
}

/** Hierarchy-aware permission check. */
export function hasPermission(
  user: PermissionedUser | null | undefined,
  perm: string,
): boolean {
  if (isSuper(user)) return true;
  return hierarchyCheck(user?.permissions ?? [], perm, false);
}

/** Hierarchy-aware anyOf. */
export function anyOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  if (isSuper(user)) return true;
  return hierarchyAnyOf(user?.permissions ?? [], perms, false);
}

/** Hierarchy-aware allOf. */
export function allOf(
  user: PermissionedUser | null | undefined,
  perms: string[],
): boolean {
  if (isSuper(user)) return true;
  return hierarchyAllOf(user?.permissions ?? [], perms, false);
}

export function isSuperAdmin(user: PermissionedUser | null | undefined): boolean {
  return isSuper(user);
}
