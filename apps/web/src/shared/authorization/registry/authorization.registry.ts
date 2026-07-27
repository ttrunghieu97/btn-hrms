import { routeRegistry } from '@/features/authorization/route-registry/routes';
import { PUBLIC_ROUTES } from '../constants/routes';
import { RESOURCES } from '../constants/resources';
import { ACTIONS } from '../constants/actions';
import { employee, payroll } from '../permissions/permissions';
import type { AuthorizationRegistry } from '../types/authorization.types';

function buildAuthorizationRegistryFromRouteRegistry(): AuthorizationRegistry {
  const routes: Record<string, { anyOf?: string[]; allOf?: string[] }> = {};

  for (const route of routeRegistry) {
    if (Object.values(PUBLIC_ROUTES).includes(route.path as any)) continue;

    const anyOf = route.permission?.anyOf;
    const allOf = route.permission?.allOf;

    routes[route.path] = {
      ...(anyOf && anyOf.length ? { anyOf: [...anyOf] } : {}),
      ...(allOf && allOf.length ? { allOf: [...allOf] } : {}),
    };
  }

  return {
    routes,
    resources: {
      [RESOURCES.EMPLOYEE.COMPENSATION]: {
        anyOf: [employee.manageSensitive, payroll.view],
      },
      [RESOURCES.EMPLOYEE.DOCUMENTS]: {
        anyOf: [employee.view, employee.viewSelf, employee.viewDepartment, employee.viewAll],
      },
      [RESOURCES.EMPLOYEE.EQUIPMENT]: {
        anyOf: [employee.view, employee.viewSelf, employee.viewDepartment, employee.viewAll],
      },
      [RESOURCES.EMPLOYEE.CONTRACTS]: {
        anyOf: [employee.view, employee.viewSelf, employee.viewDepartment, employee.viewAll],
      },
    },
    actions: {
      [ACTIONS.EMPLOYEE.CREATE]: {
        allOf: [employee.create],
      },
      [ACTIONS.EMPLOYEE.EDIT]: {
        anyOf: [employee.edit, employee.updateAll, employee.updateSelf],
      },
      [ACTIONS.EMPLOYEE.DELETE]: {
        allOf: [employee.delete],
      },
      [ACTIONS.EMPLOYEE.RESET_PASSWORD]: {
        allOf: [employee.resetPassword],
      },
    },
  };
}

export const AUTHORIZATION: AuthorizationRegistry = buildAuthorizationRegistryFromRouteRegistry();
