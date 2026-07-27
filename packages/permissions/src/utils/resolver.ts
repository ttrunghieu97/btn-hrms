import { hierarchyMap } from '../hierarchy';

/**
 * Check if user has a specific permission.
 * Hierarchy-aware: user with `attendance:view:all` automatically has `attendance:view:self`.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  required: string,
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions?.length) return false;

  // Direct match
  if (userPermissions.includes(required)) return true;

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
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions?.length) return false;
  return required.some((p) => hasPermission(userPermissions, p, false));
}

/**
 * Check if user has ALL of the required permissions.
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  required: string[],
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!userPermissions?.length) return false;
  return required.every((p) => hasPermission(userPermissions, p, false));
}

/**
 * Expand user's permissions upward through hierarchy.
 * Returns full set of implied permissions.
 */
export function resolvePermissions(
  userPermissions: string[] | undefined | null,
): string[] {
  if (!userPermissions?.length) return [];

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
