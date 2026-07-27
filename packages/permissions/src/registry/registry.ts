/**
 * Aggregated permission constants.
 * Single source of truth for the entire monorepo.
 */
import * as employeePerms from '../permissions/employee';
import * as attendancePerms from '../permissions/attendance';
import * as leavePerms from '../permissions/leave';
import * as payrollPerms from '../permissions/payroll';
import * as schedulePerms from '../permissions/schedule';
import * as systemPerms from '../permissions/system';
import * as dashboardPerms from '../permissions/dashboard';
import * as usersPerms from '../permissions/users';
import * as departmentsPerms from '../permissions/departments';
import * as profilePerms from '../permissions/profile';
import * as authPerms from '../permissions/auth';
import * as assetPerms from '../permissions/asset';
import * as benefitsPerms from '../permissions/benefits';
import * as expensesPerms from '../permissions/expenses';
import * as performancePerms from '../permissions/performance';
import * as learningPerms from '../permissions/learning';
import * as recruitmentPerms from '../permissions/recruitment';
import * as onboardingPerms from '../permissions/onboarding';
import * as offboardingPerms from '../permissions/offboarding';
import * as notificationsPerms from '../permissions/notifications';
import * as monitoringPerms from '../permissions/monitoring';
import * as chatPerms from '../permissions/chat';
import * as tasksPerms from '../permissions/tasks';
import * as approvalPerms from '../permissions/approval';
import * as locationsPerms from '../permissions/locations';
import * as rolesPerms from '../permissions/roles';

export const PermissionRegistry = {
  employee: employeePerms.employee,
  attendance: attendancePerms.attendance,
  leave: leavePerms.leave,
  payroll: payrollPerms.payroll,
  schedule: schedulePerms.schedule,
  system: systemPerms.system,
  dashboard: dashboardPerms.dashboard,
  users: usersPerms.users,
  departments: departmentsPerms.departments,
  profile: profilePerms.profile,
  auth: authPerms.auth,
  assetManagement: assetPerms.assetManagement,
  benefits: benefitsPerms.benefits,
  expenses: expensesPerms.expenses,
  performance: performancePerms.performance,
  learning: learningPerms.learning,
  recruitment: recruitmentPerms.recruitment,
  onboarding: onboardingPerms.onboarding,
  offboarding: offboardingPerms.offboarding,
  notifications: notificationsPerms.notifications,
  monitoring: monitoringPerms.monitoring,
  chat: chatPerms.chat,
  tasks: tasksPerms.tasks,
  approval: approvalPerms.approval,
  locations: locationsPerms.locations,
  roles: rolesPerms.roles,
} as const;

/** Union type of every permission string value */
export type PermissionCode =
  (typeof PermissionRegistry)[keyof typeof PermissionRegistry][keyof typeof PermissionRegistry[keyof typeof PermissionRegistry]];
