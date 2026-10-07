import { PUBLIC_ROUTES } from '../constants/routes';
import { AUTHORIZATION } from '../registry/authorization.registry';
import { evaluatePermissionRule } from './permission.resolver';

export function isPublicRoute(route: string): boolean {
  return Object.values(PUBLIC_ROUTES).includes(route as any);
}

/**
 * Match dynamic route paths (e.g. /employees/123 -> /employees/:id)
 */
function findMatchingRule(route: string) {
  if (AUTHORIZATION.routes[route]) {
    return AUTHORIZATION.routes[route];
  }

  const registeredPaths = Object.keys(AUTHORIZATION.routes);
  for (const path of registeredPaths) {
    if (!path.includes(':')) continue;
    const regexPattern = '^' + path.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    if (new RegExp(regexPattern).test(route)) {
      return AUTHORIZATION.routes[path];
    }
  }

  return undefined;
}

export function resolveRouteAccess(
  route: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  if (isPublicRoute(route)) {
    return true;
  }

  const rule = findMatchingRule(route);
  if (!rule) {
    // DEFAULT-DENY POLICY: Protected routes not registered in AUTHORIZATION.routes are strictly DENIED.
    return false;
  }

  return evaluatePermissionRule(rule, permissions);
}

export const canAccessRoute = resolveRouteAccess;
