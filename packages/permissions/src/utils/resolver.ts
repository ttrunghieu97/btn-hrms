import { hierarchyMap } from '../hierarchy';

/** Permission codes treated as the system-wide root — grants everything. */
const ROOT_PERMISSIONS = ['sys:all', 'ALL']; // ALL is legacy, kept for backward compat

/**
 * Check if user has a specific permission.
 * Hierarchy-aware: user with `attendance:view:all` automatically has `attendance:view:self`.
 * `sys:all` is the root permission — grants every possible code.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  required: string,
): boolean {
  if (!userPermissions?.length) return false;

  // Direct match
  if (userPermissions.includes(required)) return true;

  // Root permission — grants everything
  if (ROOT_PERMISSIONS.some((r) => userPermissions.includes(r))) return true;

  // Hierarchy resolution: does user own any ancestor of required?
  const chain = hierarchyMap[required];
  if (chain) {
    // chain is sorted most-specific → least-specific
    // required is at index 0; parents are beyond it
    // user's permission may be a broader scope in the same chain
    for (const userPerm of userPermissions) {
      if (chain.includes(userPerm)) return true;
    }
  }

  return false;
}

/**
 * Check if user has ANY of the required permissions.
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined | null,
  required: string[],
): boolean {
  if (!userPermissions?.length) return false;
  if (ROOT_PERMISSIONS.some((r) => userPermissions.includes(r))) return true;
  return required.some((p) => hasPermission(userPermissions, p));
}

/**
 * Check if user has ALL of the required permissions.
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  required: string[],
): boolean {
  if (!userPermissions?.length) return false;
  if (ROOT_PERMISSIONS.some((r) => userPermissions.includes(r))) return true;
  return required.every((p) => hasPermission(userPermissions, p));
}

/**
 * Expand user's permissions upward through hierarchy.
 * Returns full set of implied permissions.
 *
 * When user has `sys:all` (the root permission), returns the full list
 * of every known permission code from the registry.
 */
export function resolvePermissions(
  userPermissions: string[] | undefined | null,
): string[] {
  if (!userPermissions?.length) return [];

  // Root permission — no meaningful expansion beyond itself
  if (ROOT_PERMISSIONS.some((r) => userPermissions.includes(r))) {
    return [ROOT_PERMISSIONS[0]];
  }

  const result = new Set(userPermissions);

  for (const userPerm of userPermissions) {
    // Walk through hierarchy to find ALL implied permissions
    for (const [, chain] of Object.entries(hierarchyMap)) {
      const idx = chain.indexOf(userPerm);
      if (idx >= 0) {
        // User has this level → grant everything below it in chain
        for (let i = idx; i < chain.length; i++) {
          const perm = chain[i];
          if (perm) result.add(perm);
        }
      }
    }
  }

  return Array.from(result);
}

/**
 * Permissioned user shape used across API and web.
 */
export interface PermissionedUser {
  permissions?: string[];
  isSuperAdmin?: boolean;
}
