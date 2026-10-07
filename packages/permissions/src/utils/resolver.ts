import { hierarchyMap } from '../hierarchy';
import { PermissionRegistry } from '../registry/registry';

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

  // Root permission — returns all registered permission codes
  if (ROOT_PERMISSIONS.some((r) => userPermissions.includes(r))) {
    const allRegistered = Object.values(PermissionRegistry).flatMap(
      (domain: Record<string, string>) => Object.values(domain),
    );
    return Array.from(new Set([...ROOT_PERMISSIONS, ...allRegistered]));
  }

  const result = new Set(userPermissions);

  for (const userPerm of userPermissions) {
    // A broader user permission implies all child/narrower permissions
    // whose hierarchy chains include userPerm as an ancestor
    for (const [targetPerm, chain] of Object.entries(hierarchyMap)) {
      if (chain.includes(userPerm)) {
        result.add(targetPerm);
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
