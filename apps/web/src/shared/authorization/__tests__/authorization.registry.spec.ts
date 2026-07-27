import { AUTHORIZATION } from '../registry/authorization.registry';
import { navGroups } from '@/config/nav-config';
import { routeRegistry } from '@/features/authorization/route-registry/routes';
import { PUBLIC_ROUTES } from '../constants/routes';

describe('Authorization Registry CI Validation (Registry Sync Enforcement)', () => {
  it('every nav item URL from nav-config must be registered in AUTHORIZATION.routes or PUBLIC_ROUTES', () => {
    const navUrls = navGroups
      .flatMap((g) => g.items)
      .map((item) => item.url)
      .filter(Boolean) as string[];

    const registeredRoutes = Object.keys(AUTHORIZATION.routes);
    const publicRoutes = Object.values(PUBLIC_ROUTES) as string[];

    const missingNavUrls = navUrls.filter(
      (url) => !registeredRoutes.includes(url) && !publicRoutes.includes(url)
    );

    expect(missingNavUrls).toEqual([]);
  });

  it('every route in routeRegistry must be registered in AUTHORIZATION.routes or PUBLIC_ROUTES', () => {
    const registryPaths = routeRegistry.map((r) => r.path);
    const registeredRoutes = Object.keys(AUTHORIZATION.routes);
    const publicRoutes = Object.values(PUBLIC_ROUTES) as string[];

    const missingPaths = registryPaths.filter(
      (path) => !registeredRoutes.includes(path) && !publicRoutes.includes(path)
    );

    expect(missingPaths).toEqual([]);
  });
});
