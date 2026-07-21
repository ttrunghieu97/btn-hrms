/**
 * RBAC helpers. Single source of truth for permission codes.
 */

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

/** `:view` shortcut: granted when user has `:manage` for same resource. */
function matchesViewShortcut(perm: string, owned: string[]): boolean {
  if (!perm.endsWith(':view')) return false;
  return owned.includes(perm.replace(/:view$/, ':manage'));
}

export function hasPermission(
  user: PermissionedUser | null | undefined,
  perm: string
): boolean {
  if (isSuper(user)) return true;
  const owned = user?.permissions ?? [];
  return owned.includes(perm) || matchesViewShortcut(perm, owned);
}

export function anyOf(
  user: PermissionedUser | null | undefined,
  perms: string[]
): boolean {
  if (isSuper(user)) return true;
  return perms.some((p) => hasPermission(user, p));
}

export function allOf(
  user: PermissionedUser | null | undefined,
  perms: string[]
): boolean {
  if (isSuper(user)) return true;
  return perms.every((p) => hasPermission(user, p));
}

export function isSuperAdmin(user: PermissionedUser | null | undefined): boolean {
  return isSuper(user);
}
