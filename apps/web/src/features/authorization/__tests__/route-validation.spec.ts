import { PermissionRegistry, hasPermission } from '@project/permissions';
import { routeRegistry } from '@/shared/authorization';

const canonicalPermissions = new Set<string>(
  Object.values(PermissionRegistry).flatMap((domain: Record<string, string>) =>
    Object.values(domain)
  )
);

describe('route registry validation', () => {
  it('all routes have a path starting with /', () => {
    for (const route of routeRegistry) {
      expect(route.path).toBeTruthy();
      expect(route.path.startsWith('/')).toBe(true);
    }
  });

  it('no duplicate paths', () => {
    const paths = routeRegistry.map((r) => r.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(duplicates).toEqual([]);
  });

  it('permission rules have valid structure and reference canonical permissions', () => {
    for (const route of routeRegistry) {
      const { permission } = route;
      if (permission.anyOf) {
        expect(Array.isArray(permission.anyOf)).toBe(true);
        expect(permission.anyOf.length).toBeGreaterThan(0);
        for (const p of permission.anyOf) {
          expect(typeof p).toBe('string');
          expect(p).toMatch(/^[a-z][a-z0-9_-]*:/);
          expect(
            canonicalPermissions.has(p) || hasPermission(Array.from(canonicalPermissions), p)
          ).toBe(true);
        }
      }
    }
  });
});

