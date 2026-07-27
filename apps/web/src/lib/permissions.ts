// ── Shared package re-exports ──────────────────────────────────────────
export {
  employee,
  attendance,
  leave,
  payroll,
  schedule,
  system,
  dashboard,
  users,
  departments,
  profile,
  auth,
  assetManagement,
  benefits,
  expenses,
  performance,
  learning,
  recruitment,
  onboarding,
  offboarding,
  notifications,
  monitoring,
  chat,
  tasks,
  approval,
  PermissionRegistry,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  resolvePermissions,
  hierarchyMap,
} from '@project/permissions';
export type { PermissionedUser } from '@project/permissions';
export type { PermissionCode } from '@project/permissions';

// ── Legacy `permissions.xxx` compat ────────────────────────────────────
// Existing code uses `import { permissions } from '@/lib/permissions'`
// then accesses `permissions.employees.viewSelf`. This backward-compat
// layer maps the new module-level exports back to the old object shape.
//
// Migrate to named imports: `import { employee } from '@/lib/permissions'`
// then use `employee.viewSelf` directly.
import * as mod from '@project/permissions';

/** @deprecated Use named imports (`employee`, `attendance`, …) directly */
export const permissions = {
  dashboard: { view: mod.dashboard.view },
  employees: {
    view: mod.employee.view,
    viewSelf: mod.employee.viewSelf,
    viewDepartment: mod.employee.viewDepartment,
    viewAll: mod.employee.viewAll,
    create: mod.employee.create,
    edit: mod.employee.edit,
    resetPassword: mod.employee.resetPassword,
  },
  departments: {
    view: mod.departments.view,
    create: mod.departments.create,
    edit: mod.departments.edit,
  },
  attendance: {
    view: mod.attendance.viewSelf,
    viewSelf: mod.attendance.viewSelf,
    viewDepartment: mod.attendance.viewDepartment,
    viewAll: mod.attendance.viewAll,
    manage: mod.attendance.viewAll,
  },
  schedule: {
    view: mod.schedule.viewSelf,
    manage: mod.schedule.editAll,
  },
  leave: {
    viewSelf: mod.leave.viewSelf,
    viewDepartment: mod.leave.viewDepartment,
    viewAll: mod.leave.viewAll,
    create: mod.leave.create,
    edit: mod.leave.edit,
    approve: mod.leave.approve,
  },
  profile: {
    view: mod.profile.view,
    edit: mod.profile.edit,
  },
  auth: {
    changePassword: mod.auth.changePassword,
  },
  roles: {
    view: mod.roles!.view,
    manage: mod.users.edit,
  },
  users: {
    view: mod.users.view,
    edit: mod.users.edit,
  },
  notifications: {
    view: mod.notifications.viewSelf,
  },
  chat: {
    view: mod.chat.view,
  },
  tasks: {
    view: mod.tasks.view,
    create: mod.tasks.create,
    edit: mod.tasks.edit,
    manage: mod.tasks.edit,
  },
  products: {
    view: 'products:view',
  },
  company: {
    view: 'company:view',
  },
  billing: {
    view: 'billing:view',
  },
  demos: {
    view: 'sys:all',
  },
  monitoring: {
    view: mod.monitoring.view,
  },
  recruitment: {
    view: mod.recruitment.view,
    requisitionManage: mod.recruitment.requisitionManage,
    requisitionApprove: mod.recruitment.requisitionApprove,
    postingManage: mod.recruitment.postingManage,
    candidateManage: mod.recruitment.candidateManage,
    pipelineManage: mod.recruitment.pipelineManage,
    offerManage: mod.recruitment.offerManage,
    offerApprove: mod.recruitment.offerApprove,
  },
  assetManagement: {
    view: mod.assetManagement.view,
    catalog: mod.assetManagement.catalogManage,
    inventory: mod.assetManagement.inventoryManage,
    request: mod.assetManagement.requestCreate,
    issue: mod.assetManagement.issueManage,
  },
  benefits: {
    view: mod.benefits.view,
    manage: mod.benefits.manage,
  },
  expenses: {
    view: mod.expenses.view,
    manage: mod.expenses.manage,
  },
  performance: {
    view: mod.performance.view,
    manage: mod.performance.manage,
  },
  learning: {
    view: mod.learning.view,
    manage: mod.learning.manage,
  },
  onboarding: {
    view: mod.onboarding.view,
    manage: mod.onboarding.manage,
  },
  offboarding: {
    view: mod.offboarding.view,
    manage: mod.offboarding.edit,
    clearance: mod.offboarding.clearanceIt,
  },
} as const;

export type PermissionValue = {
  [K in keyof typeof permissions]: (typeof permissions)[K][keyof (typeof permissions)[K]];
}[keyof typeof permissions];
