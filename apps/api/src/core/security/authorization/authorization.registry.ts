import { ROUTES, RESOURCES, ACTIONS } from "./authorization.constants";
import type { AuthorizationRegistry } from "./authorization.types";
import { PermissionRegistry } from "@project/permissions";

export const AUTHORIZATION: AuthorizationRegistry = {
  routes: {
    [ROUTES.OVERVIEW]: {
      anyOf: [PermissionRegistry.dashboard.view],
    },
    [ROUTES.EMPLOYEES]: {
      anyOf: [
        PermissionRegistry.employee.view,
        PermissionRegistry.employee.viewSelf,
        PermissionRegistry.employee.viewDepartment,
        PermissionRegistry.employee.viewAll,
      ],
    },
    [ROUTES.EMPLOYEES_NEW]: {
      anyOf: [PermissionRegistry.employee.create],
    },
    [ROUTES.EMPLOYEES_DETAIL]: {
      anyOf: [
        PermissionRegistry.employee.view,
        PermissionRegistry.employee.viewSelf,
        PermissionRegistry.employee.viewDepartment,
        PermissionRegistry.employee.viewAll,
      ],
    },
    [ROUTES.EMPLOYEES_CONTRACTS]: {
      anyOf: [
        PermissionRegistry.employee.view,
        PermissionRegistry.employee.viewSelf,
        PermissionRegistry.employee.viewDepartment,
        PermissionRegistry.employee.viewAll,
      ],
    },
    [ROUTES.EMPLOYEES_DOCUMENTS]: {
      anyOf: [
        PermissionRegistry.employee.view,
        PermissionRegistry.employee.viewSelf,
        PermissionRegistry.employee.viewDepartment,
        PermissionRegistry.employee.viewAll,
      ],
    },
    [ROUTES.ORGANIZATION]: {
      anyOf: [PermissionRegistry.system.all],
    },
    [ROUTES.ATTENDANCE]: {
      anyOf: [
        PermissionRegistry.attendance.viewSelf,
        PermissionRegistry.attendance.viewDepartment,
        PermissionRegistry.attendance.viewAll,
      ],
    },
    [ROUTES.LEAVE]: {
      anyOf: [
        PermissionRegistry.leave.viewSelf,
        PermissionRegistry.leave.viewDepartment,
        PermissionRegistry.leave.viewAll,
      ],
    },
    [ROUTES.SCHEDULE]: {
      anyOf: [
        PermissionRegistry.schedule.viewSelf,
        PermissionRegistry.schedule.viewDepartment,
        PermissionRegistry.schedule.viewAll,
      ],
    },
    [ROUTES.PAYROLL]: {
      anyOf: [PermissionRegistry.payroll.view, PermissionRegistry.payroll.viewAll],
    },
    [ROUTES.SETTINGS]: {
      anyOf: [PermissionRegistry.system.all],
    },
    [ROUTES.RECRUITMENT]: {
      anyOf: [PermissionRegistry.recruitment.view],
    },
    [ROUTES.ASSET_MANAGEMENT]: {
      anyOf: [PermissionRegistry.assetManagement.view],
    },
    [ROUTES.BENEFITS]: {
      anyOf: [PermissionRegistry.benefits.view],
    },
    [ROUTES.EXPENSES]: {
      anyOf: [PermissionRegistry.expenses.view],
    },
    [ROUTES.PERFORMANCE]: {
      anyOf: [PermissionRegistry.performance.view],
    },
    [ROUTES.LEARNING]: {
      anyOf: [PermissionRegistry.learning.view],
    },
    [ROUTES.ONBOARDING]: {
      anyOf: [PermissionRegistry.onboarding.view],
    },
    [ROUTES.OFFBOARDING]: {
      anyOf: [PermissionRegistry.offboarding.view],
    },
    [ROUTES.TASKS]: {
      anyOf: [PermissionRegistry.tasks.view],
    },
    [ROUTES.CHAT]: {
      anyOf: [PermissionRegistry.chat.view],
    },
    [ROUTES.MONITORING]: {
      anyOf: [PermissionRegistry.monitoring.view],
    },
    [ROUTES.ADMINISTRATION]: {
      anyOf: [PermissionRegistry.users.view],
    },
    [ROUTES.ACCOUNT_PROFILE]: {
      anyOf: [PermissionRegistry.profile.view],
    },
    [ROUTES.ACCOUNT_NOTIFICATIONS]: {
      anyOf: [PermissionRegistry.notifications.viewSelf],
    },
    [ROUTES.CHANGE_PASSWORD]: {
      anyOf: [PermissionRegistry.auth.changePassword],
    },
  },

  resources: {
    [RESOURCES.EMPLOYEE.COMPENSATION]: {
      anyOf: [
        PermissionRegistry.employee.manageSensitive,
        PermissionRegistry.payroll.view,
      ],
    },
  },

  actions: {
    [ACTIONS.EMPLOYEE.CREATE]: {
      allOf: [PermissionRegistry.employee.create],
    },
    [ACTIONS.EMPLOYEE.DELETE]: {
      allOf: [PermissionRegistry.employee.delete],
    },
  },
};
