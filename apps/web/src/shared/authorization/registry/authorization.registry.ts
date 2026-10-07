import { PUBLIC_ROUTES } from '../constants/routes';
import { RESOURCES } from '../constants/resources';
import { ACTIONS } from '../constants/actions';
import { employee, payroll } from '../permissions/permissions';
import type { AuthorizationRegistry, AuthorizationRule } from '../types/authorization.types';

export function buildAuthorizationRegistry(
  routeList?: readonly { path: string; permission?: { anyOf?: readonly string[]; allOf?: readonly string[] } }[]
): AuthorizationRegistry {
  const routes: Record<string, AuthorizationRule> = {};

  if (routeList) {
    for (const route of routeList) {
      if (Object.values(PUBLIC_ROUTES).includes(route.path as any)) continue;

      const anyOf = route.permission?.anyOf;
      const allOf = route.permission?.allOf;

      routes[route.path] = {
        ...(anyOf && anyOf.length ? { anyOf: [...anyOf] } : {}),
        ...(allOf && allOf.length ? { allOf: [...allOf] } : {}),
      };
    }
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

import { routeRegistry } from '../route-registry/routes';
export const AUTHORIZATION: AuthorizationRegistry = buildAuthorizationRegistry(routeRegistry);
