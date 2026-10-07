import type { PermissionedUser } from '@project/permissions';
import { can, type PermissionRule } from '@/lib/permission-resolver';
import { routeRegistry, type RouteDef } from '@/shared/authorization';
import { matchRoute } from './route-matcher';

/**
 * Resolve permission rule for a given pathname.
 * Returns the rule if a matching route is found, null otherwise.
 */
export function resolveRoutePermission(pathname: string): PermissionRule | null {
  const match = matchRoute(pathname, routeRegistry);
  return match?.route.permission ?? null;
}

/**
 * Check if user can access a given pathname.
 * Uses route registry + hierarchy-aware permission resolver.
 */
export function canAccessRoute(
  pathname: string,
  user: PermissionedUser | null | undefined,
): boolean {
  const rule = resolveRoutePermission(pathname);
  if (!rule) return true; // unknown route → allow
  // Empty rule (no anyOf/allOf/not) → any authenticated user allowed
  if (!rule.anyOf?.length && !rule.allOf?.length && !rule.not?.length) return true;
  return can(user, rule);
}

/**
 * Find the route definition for a pathname.
 */
export function findRoute(pathname: string): RouteDef | null {
  const match = matchRoute(pathname, routeRegistry);
  return match?.route ?? null;
}

/**
 * Find all route definitions (for validation / debugging).
 */
export function getAllRoutes(): readonly RouteDef[] {
  return routeRegistry;
}
