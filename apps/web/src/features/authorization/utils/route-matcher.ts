import type { RouteDef } from '@/shared/authorization';

/**
 * Convert route path with `:param` segments to a RegExp.
 *   "/employees/:id" → /^\/employees\/([^/]+)$/
 *   "/attendance"    → /^\/attendantce$/
 */
function pathToRegExp(path: string): RegExp {
  // Escape regex special chars EXCEPT `:` which marks params
  const escaped = path
    .replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');
  return new RegExp(`^${escaped}$`);
}

/**
 * Extract param names from a route path.
 *   "/employees/:id/contracts" → ["id"]
 */
function extractParams(path: string): string[] {
  const params: string[] = [];
  const re = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = re.exec(path)) !== null) {
    params.push(match[1]!);
  }
  return params;
}

export interface MatchResult {
  route: RouteDef;
  params: Record<string, string>;
}

/**
 * Match a real URL pathname against the route registry.
 * Returns the most-specific matching route + extracted params.
 *
 *   matchRoute("/employees/42", registry)
 *   → { route: { path: "/employees/:id", ... }, params: { id: "42" } }
 */
export function matchRoute(
  pathname: string,
  registry: readonly RouteDef[],
): MatchResult | null {
  // Normalize — remove trailing slash
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  for (const route of registry) {
    const re = pathToRegExp(route.path);
    const match = normalized.match(re);
    if (match) {
      const paramNames = extractParams(route.path);
      const params: Record<string, string> = {};
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]!] = match[i + 1]!;
      }
      return { route, params };
    }
  }

  // Parent route fallback (e.g. /overview/operations -> /overview)
  const segments = normalized.split('/').filter(Boolean);
  while (segments.length > 1) {
    segments.pop();
    const parentPath = '/' + segments.join('/');
    const parentMatch = matchRoute(parentPath, registry);
    if (parentMatch) {
      return parentMatch;
    }
  }

  return null;
}
