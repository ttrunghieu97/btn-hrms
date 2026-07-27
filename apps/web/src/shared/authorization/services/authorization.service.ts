import { resolveRouteAccess } from '../resolvers/route.resolver';
import { resolveResourceAccess } from '../resolvers/resource.resolver';
import { resolveActionAccess } from '../resolvers/action.resolver';

export const authorizationService = {
  canAccessRoute(route: string, permissions: readonly string[] | null | undefined): boolean {
    return resolveRouteAccess(route, permissions);
  },

  canAccessResource(resource: string, permissions: readonly string[] | null | undefined): boolean {
    return resolveResourceAccess(resource, permissions);
  },

  canPerformAction(action: string, permissions: readonly string[] | null | undefined): boolean {
    return resolveActionAccess(action, permissions);
  },
};

export const canAccessRoute = authorizationService.canAccessRoute;
export const canAccessResource = authorizationService.canAccessResource;
export const canPerformAction = authorizationService.canPerformAction;
