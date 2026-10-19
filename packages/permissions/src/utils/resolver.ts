import { hierarchyMap } from '../hierarchy';
import { PermissionRegistry } from '../registry/registry';

/** Permission codes treated as the system-wide root — grants everything. */
const ROOT_PERMISSIONS = ['sys:all', 'ALL']; // ALL is legacy, kept for backward compat

function toEmployeeAliases(code: string): string[] {
  if (code.startsWith('employees:')) {
    return [code, `employee:${code.slice('employees:'.length)}`];
  }
  if (code.startsWith('employee:')) {
    return [code, `employees:${code.slice('employee:'.length)}`];
  }
  return [code];
}

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

  const normalizedUserPerms = new Set<string>();
  for (const perm of userPermissions) {
    for (const alias of toEmployeeAliases(perm)) {
      normalizedUserPerms.add(alias);
    }
  }

  const requiredAliases = toEmployeeAliases(required);

  // Direct match
  if (requiredAliases.some((r) => normalizedUserPerms.has(r))) return true;

  // Root permission — grants everything
  if (ROOT_PERMISSIONS.some((r) => normalizedUserPerms.has(r))) return true;

  // Hierarchy resolution: does user own any ancestor of required?
  for (const reqCode of requiredAliases) {
    const chain = hierarchyMap[reqCode];
    if (chain) {
      for (const ancestor of chain) {
        if (normalizedUserPerms.has(ancestor)) return true;
      }
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

  const result = new Set<string>();
  for (const perm of userPermissions) {
    for (const alias of toEmployeeAliases(perm)) {
      result.add(alias);
    }
  }

  for (const userPerm of Array.from(result)) {
    // A broader user permission implies all child/narrower permissions
    // whose hierarchy chains include userPerm as an ancestor
    for (const [targetPerm, chain] of Object.entries(hierarchyMap)) {
      if (chain.includes(userPerm)) {
        for (const alias of toEmployeeAliases(targetPerm)) {
          result.add(alias);
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
