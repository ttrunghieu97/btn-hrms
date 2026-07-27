/**
 * Central permission code catalog.
 * Re-exports from shared @project/permissions package for backward compat.
 *
 * Legacy naming: EMPLOYEES_VIEW_SELF
 * Shared naming: PermissionRegistry.employee.viewSelf
 *
 * Migration: use @project/permissions directly for new code.
 */
import { PermissionRegistry } from '@project/permissions';

export const Permissions = {
  // -- System
  SYS_ALL: PermissionRegistry.system.all,

  // -- Dashboard
  DASHBOARD_VIEW: PermissionRegistry.dashboard.view,

  // -- Users
  USERS_VIEW: PermissionRegistry.users.view,
  USERS_CREATE: PermissionRegistry.users.create,
  USERS_EDIT: PermissionRegistry.users.edit,
  USERS_DELETE: PermissionRegistry.users.delete,

  // -- Employees
  EMPLOYEES_VIEW: PermissionRegistry.employee.view,
  EMPLOYEES_CREATE: PermissionRegistry.employee.create,
  EMPLOYEES_EDIT: PermissionRegistry.employee.edit,
  EMPLOYEES_RESET_PASSWORD: PermissionRegistry.employee.resetPassword,
  EMPLOYEES_DELETE: PermissionRegistry.employee.delete,
  EMPLOYEES_MANAGE: PermissionRegistry.employee.manage,
  EMPLOYEES_VIEW_SELF: PermissionRegistry.employee.viewSelf,
  EMPLOYEES_VIEW_DEPARTMENT: PermissionRegistry.employee.viewDepartment,
  EMPLOYEES_VIEW_ALL: PermissionRegistry.employee.viewAll,
  EMPLOYEES_VIEW_SENSITIVE: PermissionRegistry.employee.viewSensitive,
  EMPLOYEES_UPDATE_SELF_LIMITED: PermissionRegistry.employee.updateSelf,
  EMPLOYEES_UPDATE_ALL: PermissionRegistry.employee.updateAll,
  EMPLOYEES_MANAGE_SENSITIVE: PermissionRegistry.employee.manageSensitive,

  // -- Departments
  DEPARTMENTS_VIEW: PermissionRegistry.departments.view,
  DEPARTMENTS_CREATE: PermissionRegistry.departments.create,
  DEPARTMENTS_EDIT: PermissionRegistry.departments.edit,
  DEPARTMENTS_DELETE: PermissionRegistry.departments.delete,

  // -- Schedule
  SCHEDULE_VIEW_SELF: PermissionRegistry.schedule.viewSelf,
  SCHEDULE_VIEW_DEPARTMENT: PermissionRegistry.schedule.viewDepartment,
  SCHEDULE_VIEW_ALL: PermissionRegistry.schedule.viewAll,
  SCHEDULE_EDIT_SELF: PermissionRegistry.schedule.editSelf,
  SCHEDULE_EDIT_DEPARTMENT: PermissionRegistry.schedule.editDepartment,
  SCHEDULE_EDIT_ALL: PermissionRegistry.schedule.editAll,
  SCHEDULE_CREATE: PermissionRegistry.schedule.create,
  SCHEDULE_DELETE: PermissionRegistry.schedule.delete,
  SCHEDULE_COPY: PermissionRegistry.schedule.copy,

  // -- Attendance
  ATTENDANCE_CHECK: PermissionRegistry.attendance.check,
  ATTENDANCE_VIEW_SELF: PermissionRegistry.attendance.viewSelf,
  ATTENDANCE_VIEW_DEPARTMENT: PermissionRegistry.attendance.viewDepartment,
  ATTENDANCE_VIEW_ALL: PermissionRegistry.attendance.viewAll,
  ATTENDANCE_REPORT: PermissionRegistry.attendance.report,
  ATTENDANCE_OVERTIME_SUBMIT: PermissionRegistry.attendance.overtimeSubmit,
  ATTENDANCE_OVERTIME_APPROVE: PermissionRegistry.attendance.overtimeApprove,

  // -- Tasks
  TASKS_VIEW: PermissionRegistry.tasks.view,
  TASKS_VIEW_SELF: PermissionRegistry.tasks.viewSelf,
  TASKS_CREATE: PermissionRegistry.tasks.create,
  TASKS_EDIT: PermissionRegistry.tasks.edit,
  TASKS_DELETE: PermissionRegistry.tasks.delete,
  TASKS_ASSIGN: PermissionRegistry.tasks.assign,

  // -- Files
  FILES_UPLOAD: 'files:upload',

  // -- Payroll
  PAYROLL_VIEW: PermissionRegistry.payroll.view,
  PAYROLL_EDIT: PermissionRegistry.payroll.edit,
  PAYROLL_MANAGE_PERIODS: PermissionRegistry.payroll.managePeriods,
  PAYROLL_MANAGE_PAYSLIPS: PermissionRegistry.payroll.managePayslips,
  PAYROLL_VIEW_SELF: PermissionRegistry.payroll.viewSelf,
  PAYROLL_VIEW_ALL: PermissionRegistry.payroll.viewAll,
  PAYROLL_MANAGE: PermissionRegistry.payroll.manage,

  // -- Leave
  LEAVE_VIEW: PermissionRegistry.leave.view,
  LEAVE_CREATE: PermissionRegistry.leave.create,
  LEAVE_EDIT: PermissionRegistry.leave.edit,
  LEAVE_APPROVE: PermissionRegistry.leave.approve,
  LEAVE_BALANCE_VIEW: PermissionRegistry.leave.balanceView,
  LEAVE_VIEW_SELF: PermissionRegistry.leave.viewSelf,
  LEAVE_VIEW_DEPARTMENT: PermissionRegistry.leave.viewDepartment,
  LEAVE_VIEW_ALL: PermissionRegistry.leave.viewAll,
  LEAVE_APPROVE_DEPARTMENT: PermissionRegistry.leave.approveDepartment,

  // -- Recruitment
  RECRUITMENT_VIEW: PermissionRegistry.recruitment.view,
  RECRUITMENT_REQUISITION_MANAGE: PermissionRegistry.recruitment.requisitionManage,
  RECRUITMENT_REQUISITION_APPROVE: PermissionRegistry.recruitment.requisitionApprove,
  RECRUITMENT_POSTING_MANAGE: PermissionRegistry.recruitment.postingManage,
  RECRUITMENT_CANDIDATE_MANAGE: PermissionRegistry.recruitment.candidateManage,
  RECRUITMENT_PIPELINE_MANAGE: PermissionRegistry.recruitment.pipelineManage,
  RECRUITMENT_OFFER_MANAGE: PermissionRegistry.recruitment.offerManage,
  RECRUITMENT_OFFER_APPROVE: PermissionRegistry.recruitment.offerApprove,

  // -- Asset Management
  ASSET_VIEW: PermissionRegistry.assetManagement.view,
  ASSET_CATALOG_MANAGE: PermissionRegistry.assetManagement.catalogManage,
  ASSET_INVENTORY_MANAGE: PermissionRegistry.assetManagement.inventoryManage,
  ASSET_REQUEST_CREATE: PermissionRegistry.assetManagement.requestCreate,
  ASSET_REQUEST_APPROVE: PermissionRegistry.assetManagement.requestApprove,
  ASSET_ISSUE_MANAGE: PermissionRegistry.assetManagement.issueManage,
  ASSET_VIEW_SELF: PermissionRegistry.assetManagement.viewSelf,

  // -- Locations
  LOCATIONS_VIEW: PermissionRegistry.locations.view,
  LOCATIONS_CREATE: PermissionRegistry.locations.create,
  LOCATIONS_EDIT: PermissionRegistry.locations.edit,
  LOCATIONS_DELETE: PermissionRegistry.locations.delete,

  // -- Audit Logs (kept as string — no module yet)
  AUDIT_LOGS_VIEW: 'audit-logs:view',

  // -- Roles
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_EDIT: 'roles:edit',
  ROLES_DELETE: 'roles:delete',

  // -- GPS Logs
  GPS_LOGS_VIEW: 'gps-logs:view',
  GPS_LOGS_SUBMIT: 'gps-logs:submit',

  // -- Profile
  PROFILE_VIEW: PermissionRegistry.profile.view,

  // -- Chat
  CHAT_VIEW: PermissionRegistry.chat.view,
  CHAT_SEND: PermissionRegistry.chat.send,

  // -- Notifications
  NOTIFICATIONS_VIEW_SELF: PermissionRegistry.notifications.viewSelf,
  NOTIFICATIONS_MANAGE_PLATFORM: PermissionRegistry.notifications.manageAll,

  // -- Monitoring
  MONITORING_VIEW: PermissionRegistry.monitoring.view,

  // -- Approval Engine
  APPROVAL_POLICIES_VIEW: PermissionRegistry.approval.policiesView,
  APPROVAL_POLICIES_CREATE: PermissionRegistry.approval.policiesCreate,
  APPROVAL_POLICIES_EDIT: PermissionRegistry.approval.policiesEdit,
  APPROVAL_POLICIES_DELETE: PermissionRegistry.approval.policiesDelete,
  APPROVAL_REQUESTS_VIEW: PermissionRegistry.approval.requestsView,
  APPROVAL_REQUESTS_CREATE: PermissionRegistry.approval.requestsCreate,
  APPROVAL_REQUESTS_DECIDE: PermissionRegistry.approval.requestsDecide,
  APPROVAL_REQUESTS_CANCEL: PermissionRegistry.approval.requestsCancel,
  APPROVAL_INBOX_VIEW: PermissionRegistry.approval.inboxView,

  // -- Workflow Engine
  WORKFLOW_DEFINITIONS_VIEW: 'workflow-definitions:view',
  WORKFLOW_INSTANCES_VIEW: 'workflow-instances:view',
  WORKFLOW_INSTANCES_START: 'workflow-instances:start',
  WORKFLOW_INSTANCES_TRANSITION: 'workflow-instances:transition',
  WORKFLOW_INSTANCES_CANCEL: 'workflow-instances:cancel',

  // -- Offboarding
  OFFBOARDING_VIEW: PermissionRegistry.offboarding.view,
  OFFBOARDING_CREATE: PermissionRegistry.offboarding.create,
  OFFBOARDING_EDIT: PermissionRegistry.offboarding.edit,
  OFFBOARDING_DELETE: PermissionRegistry.offboarding.delete,
  OFFBOARDING_CLEARANCE_IT: PermissionRegistry.offboarding.clearanceIt,
  OFFBOARDING_CLEARANCE_HR: PermissionRegistry.offboarding.clearanceHr,
  OFFBOARDING_CLEARANCE_FINANCE: PermissionRegistry.offboarding.clearanceFinance,
  OFFBOARDING_CLEARANCE_MANAGER: PermissionRegistry.offboarding.clearanceManager,
  OFFBOARDING_CLEARANCE_SECURITY: PermissionRegistry.offboarding.clearanceSecurity,
  OFFBOARDING_EXIT_INTERVIEW: PermissionRegistry.offboarding.exitInterview,
  OFFBOARDING_COMPLETE: PermissionRegistry.offboarding.complete,

  // -- Auth
  AUTH_CHANGE_PASSWORD: PermissionRegistry.auth.changePassword,
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

// ─── CATALOG ────────────────────────────────────────────────────────────

const CATALOG_PERMISSION_CODES = [
  Permissions.SYS_ALL,
  Permissions.EMPLOYEES_VIEW_SELF,
  Permissions.EMPLOYEES_VIEW_DEPARTMENT,
  Permissions.EMPLOYEES_VIEW_ALL,
  Permissions.EMPLOYEES_VIEW_SENSITIVE,
  Permissions.EMPLOYEES_UPDATE_SELF_LIMITED,
  Permissions.EMPLOYEES_UPDATE_ALL,
  Permissions.EMPLOYEES_MANAGE_SENSITIVE,
  Permissions.ATTENDANCE_VIEW_SELF,
  Permissions.ATTENDANCE_VIEW_DEPARTMENT,
  Permissions.ATTENDANCE_VIEW_ALL,
  Permissions.LEAVE_VIEW_SELF,
  Permissions.LEAVE_VIEW_DEPARTMENT,
  Permissions.LEAVE_VIEW_ALL,
  Permissions.LEAVE_APPROVE_DEPARTMENT,
  Permissions.PAYROLL_VIEW_SELF,
  Permissions.PAYROLL_VIEW_ALL,
  Permissions.PAYROLL_MANAGE,
  Permissions.NOTIFICATIONS_VIEW_SELF,
  Permissions.NOTIFICATIONS_MANAGE_PLATFORM,
  Permissions.PROFILE_VIEW,
] as const;

export const PERMISSION_CATALOG = CATALOG_PERMISSION_CODES.map((code) => {
  const [domain, action, scope] = code.split(':');
  return {
    code,
    domain: domain!,
    action: action!,
    scope: scope ?? null,
    description: code,
  };
});

// ─── HIERARCHY ──────────────────────────────────────────────────────────

export const PERMISSION_HIERARCHY: readonly [string, string][] = [
  [Permissions.ATTENDANCE_VIEW_ALL, Permissions.ATTENDANCE_VIEW_DEPARTMENT],
  [Permissions.ATTENDANCE_VIEW_DEPARTMENT, Permissions.ATTENDANCE_VIEW_SELF],
  [Permissions.ATTENDANCE_OVERTIME_APPROVE, Permissions.ATTENDANCE_OVERTIME_SUBMIT],

  [Permissions.SCHEDULE_VIEW_ALL, Permissions.SCHEDULE_VIEW_DEPARTMENT],
  [Permissions.SCHEDULE_VIEW_DEPARTMENT, Permissions.SCHEDULE_VIEW_SELF],
  [Permissions.SCHEDULE_EDIT_ALL, Permissions.SCHEDULE_EDIT_DEPARTMENT],
  [Permissions.SCHEDULE_EDIT_DEPARTMENT, Permissions.SCHEDULE_EDIT_SELF],

  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_VIEW],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_EDIT],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_DELETE],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_RESET_PASSWORD],
  [Permissions.EMPLOYEES_MANAGE_SENSITIVE, Permissions.EMPLOYEES_VIEW_SENSITIVE],
  [Permissions.EMPLOYEES_MANAGE, Permissions.FILES_UPLOAD],

  [Permissions.TASKS_VIEW, Permissions.TASKS_VIEW_SELF],

  [Permissions.LOCATIONS_EDIT, Permissions.LOCATIONS_VIEW],
  [Permissions.LOCATIONS_CREATE, Permissions.LOCATIONS_VIEW],
  [Permissions.LOCATIONS_DELETE, Permissions.LOCATIONS_VIEW],

  [Permissions.PAYROLL_EDIT, Permissions.PAYROLL_VIEW],
  [Permissions.PAYROLL_MANAGE_PERIODS, Permissions.PAYROLL_VIEW],
  [Permissions.PAYROLL_MANAGE_PAYSLIPS, Permissions.PAYROLL_VIEW],

  [Permissions.LEAVE_APPROVE, Permissions.LEAVE_VIEW],
  [Permissions.CHAT_SEND, Permissions.CHAT_VIEW],

  [Permissions.ASSET_CATALOG_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_INVENTORY_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_ISSUE_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_REQUEST_APPROVE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_VIEW, Permissions.ASSET_VIEW_SELF],

  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_VIEW],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_IT],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_HR],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_FINANCE],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_MANAGER],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_SECURITY],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_EXIT_INTERVIEW],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_COMPLETE],
] as const;
