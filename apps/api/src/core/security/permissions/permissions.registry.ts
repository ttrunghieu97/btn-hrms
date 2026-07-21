/**
 * Central permission code catalog.
 *
 * Naming convention:  <resource>:<action>[:<scope>]
 *
 * Scopes (most-to-least privileged):
 *   :all        ? all records system-wide
 *   :department ? records within the caller's department
 *   :self       ? only the caller's own records
 */
export const Permissions = {
  // -- System -------------------------------------------------------------
  SYS_ALL: "sys:all",

  // -- Dashboard ----------------------------------------------------------
  DASHBOARD_VIEW: "dashboard:view",

  // -- Locations ----------------------------------------------------------
  LOCATIONS_VIEW: "locations:view",
  LOCATIONS_CREATE: "locations:create",
  LOCATIONS_EDIT: "locations:edit",
  LOCATIONS_DELETE: "locations:delete",

  // -- GPS Logs -----------------------------------------------------------
  GPS_LOGS_VIEW: "gps-logs:view",
  GPS_LOGS_SUBMIT: "gps-logs:submit",

  // -- Users ---------------------------------------------------------------
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",

  // -- Employees -----------------------------------------------------------
  EMPLOYEES_VIEW: "employees:view",
  EMPLOYEES_CREATE: "employees:create",
  EMPLOYEES_EDIT: "employees:edit",
  EMPLOYEES_RESET_PASSWORD: "employees:reset-password",
  EMPLOYEES_DELETE: "employees:delete",
  EMPLOYEES_MANAGE: "employees:manage", // synthetic parent ? view + edit
  EMPLOYEES_VIEW_SELF: "employees:view:self",
  EMPLOYEES_VIEW_DEPARTMENT: "employees:view:department",
  EMPLOYEES_VIEW_ALL: "employees:view:all",
  EMPLOYEES_VIEW_SENSITIVE: "employees:view:sensitive",
  EMPLOYEES_UPDATE_SELF_LIMITED: "employees:update:self",
  EMPLOYEES_UPDATE_ALL: "employees:update:all",
  EMPLOYEES_MANAGE_SENSITIVE: "employees:manage:sensitive",

  // -- Departments --------------------------------------------------------
  DEPARTMENTS_VIEW: "departments:view",
  DEPARTMENTS_CREATE: "departments:create",
  DEPARTMENTS_EDIT: "departments:edit",
  DEPARTMENTS_DELETE: "departments:delete",

  // -- Schedule (scoped) ---------------------------------------------------
  SCHEDULE_VIEW_SELF: "schedule:view:self",
  SCHEDULE_VIEW_DEPARTMENT: "schedule:view:department",
  SCHEDULE_VIEW_ALL: "schedule:view:all",
  SCHEDULE_EDIT_SELF: "schedule:edit:self",
  SCHEDULE_EDIT_DEPARTMENT: "schedule:edit:department",
  SCHEDULE_EDIT_ALL: "schedule:edit:all",
  SCHEDULE_CREATE: "schedule:create",
  SCHEDULE_DELETE: "schedule:delete",
  SCHEDULE_COPY: "schedule:copy",

  // -- Attendance (scoped) -------------------------------------------------
  ATTENDANCE_CHECK: "attendance:check",
  ATTENDANCE_VIEW_SELF: "attendance:view:self",
  ATTENDANCE_VIEW_DEPARTMENT: "attendance:view:department",
  ATTENDANCE_VIEW_ALL: "attendance:view:all",
  ATTENDANCE_REPORT: "attendance:report",
  ATTENDANCE_OVERTIME_SUBMIT: "attendance:overtime:submit",
  ATTENDANCE_OVERTIME_APPROVE: "attendance:overtime:approve",

  // -- Tasks ---------------------------------------------------------------
  TASKS_VIEW: "tasks:view",
  TASKS_VIEW_SELF: "tasks:view:self",
  TASKS_CREATE: "tasks:create",
  TASKS_EDIT: "tasks:edit",
  TASKS_DELETE: "tasks:delete",
  TASKS_ASSIGN: "tasks:assign",

  // -- Files ---------------------------------------------------------------
  FILES_UPLOAD: "files:upload",

  // -- Payroll -------------------------------------------------------------
  PAYROLL_VIEW: "payroll:view",
  PAYROLL_EDIT: "payroll:edit",
  PAYROLL_MANAGE_PERIODS: "payroll:manage_periods",
  PAYROLL_MANAGE_PAYSLIPS: "payroll:manage_payslips",
  PAYROLL_VIEW_SELF: "payroll:view:self",
  PAYROLL_VIEW_ALL: "payroll:view:all",
  PAYROLL_MANAGE: "payroll:manage:all",

  // -- Leave Management ---------------------------------------------------
  LEAVE_VIEW: "leave:view",
  LEAVE_CREATE: "leave:create",
  LEAVE_EDIT: "leave:edit",
  LEAVE_APPROVE: "leave:approve",
  LEAVE_BALANCE_VIEW: "leave-balance:view",
  LEAVE_VIEW_SELF: "leave:view:self",
  LEAVE_VIEW_DEPARTMENT: "leave:view:department",
  LEAVE_VIEW_ALL: "leave:view:all",
  LEAVE_APPROVE_DEPARTMENT: "leave:approve:department",

  // -- Recruitment --------------------------------------------------------
  RECRUITMENT_VIEW: "recruitment:view",
  RECRUITMENT_REQUISITION_MANAGE: "recruitment:requisition:manage",
  RECRUITMENT_REQUISITION_APPROVE: "recruitment:requisition:approve",
  RECRUITMENT_POSTING_MANAGE: "recruitment:posting:manage",
  RECRUITMENT_CANDIDATE_MANAGE: "recruitment:candidate:manage",
  RECRUITMENT_PIPELINE_MANAGE: "recruitment:pipeline:manage",
  RECRUITMENT_OFFER_MANAGE: "recruitment:offer:manage",
  RECRUITMENT_OFFER_APPROVE: "recruitment:offer:approve",

  // -- Asset Management ---------------------------------------------------
  ASSET_VIEW: "asset:view",
  ASSET_CATALOG_MANAGE: "asset:catalog:manage",
  ASSET_INVENTORY_MANAGE: "asset:inventory:manage",
  ASSET_REQUEST_CREATE: "asset:request:create",
  ASSET_REQUEST_APPROVE: "asset:request:approve",
  ASSET_ISSUE_MANAGE: "asset:issue:manage",
  ASSET_VIEW_SELF: "asset:view:self",

  // -- Audit Logs ---------------------------------------------------------
  AUDIT_LOGS_VIEW: "audit-logs:view",

  // -- Roles (new) --------------------------------------------------------
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",

  // -- Chat ---------------------------------------------------------------
  CHAT_VIEW: "chat:view",
  CHAT_SEND: "chat:send",

  // -- Notifications ------------------------------------------------------
  NOTIFICATIONS_VIEW_SELF: "notifications:view:self",
  NOTIFICATIONS_MANAGE_PLATFORM: "notifications:manage:all",

  // -- Monitoring ---------------------------------------------------------
  MONITORING_VIEW: "monitoring:view",

  // -- Approval Engine ----------------------------------------------------
  APPROVAL_POLICIES_VIEW: "approval-policies:view",
  APPROVAL_POLICIES_CREATE: "approval-policies:create",
  APPROVAL_POLICIES_EDIT: "approval-policies:edit",
  APPROVAL_POLICIES_DELETE: "approval-policies:delete",
  APPROVAL_REQUESTS_VIEW: "approval-requests:view",
  APPROVAL_REQUESTS_CREATE: "approval-requests:create",
  APPROVAL_REQUESTS_DECIDE: "approval-requests:decide",
  APPROVAL_REQUESTS_CANCEL: "approval-requests:cancel",
  APPROVAL_INBOX_VIEW: "approval-inbox:view",

  // -- Workflow Engine ----------------------------------------------------
  WORKFLOW_DEFINITIONS_VIEW: "workflow-definitions:view",
  WORKFLOW_INSTANCES_VIEW: "workflow-instances:view",
  WORKFLOW_INSTANCES_START: "workflow-instances:start",
  WORKFLOW_INSTANCES_TRANSITION: "workflow-instances:transition",
  WORKFLOW_INSTANCES_CANCEL: "workflow-instances:cancel",  // -- Offboarding ----------------------------------------------------------
  OFFBOARDING_VIEW: "offboarding:view",
  OFFBOARDING_CREATE: "offboarding:create",
  OFFBOARDING_EDIT: "offboarding:edit",
  OFFBOARDING_DELETE: "offboarding:delete",
  OFFBOARDING_CLEARANCE_IT: "offboarding:clearance:it",
  OFFBOARDING_CLEARANCE_HR: "offboarding:clearance:hr",
  OFFBOARDING_CLEARANCE_FINANCE: "offboarding:clearance:finance",
  OFFBOARDING_CLEARANCE_MANAGER: "offboarding:clearance:manager",
  OFFBOARDING_CLEARANCE_SECURITY: "offboarding:clearance:security",
  OFFBOARDING_EXIT_INTERVIEW: "offboarding:exit-interview",
  OFFBOARDING_COMPLETE: "offboarding:complete",
  AUTH_CHANGE_PASSWORD: "auth:change-password",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

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
] as const;

export const PERMISSION_CATALOG = CATALOG_PERMISSION_CODES.map((code) => {
  const [domain, action, scope] = code.split(":");
  return {
    code,
    domain: domain!,
    action: action!,
    scope: scope ?? null,
    description: code,
  };
});

// --- Built-in permission hierarchy -------------------------------------
//
// Format: [parent, child]
// "Having parent" implies "having child".
//
// attendance:view:all ? attendance:view:department ? attendance:view:self
// schedule:view:all   ? schedule:view:department   ? schedule:view:self
// employees:manage    ? employees:view
// employees:manage    ? employees:edit
// employees:manage    ? files:upload
// tasks:view          ? tasks:view:self
//
export const PERMISSION_HIERARCHY: readonly [string, string][] = [
  // Attendance scope chain
  [Permissions.ATTENDANCE_VIEW_ALL, Permissions.ATTENDANCE_VIEW_DEPARTMENT],
  [Permissions.ATTENDANCE_VIEW_DEPARTMENT, Permissions.ATTENDANCE_VIEW_SELF],
  [
    Permissions.ATTENDANCE_OVERTIME_APPROVE,
    Permissions.ATTENDANCE_OVERTIME_SUBMIT,
  ],

  // Schedule scope chain
  [Permissions.SCHEDULE_VIEW_ALL, Permissions.SCHEDULE_VIEW_DEPARTMENT],
  [Permissions.SCHEDULE_VIEW_DEPARTMENT, Permissions.SCHEDULE_VIEW_SELF],
  [Permissions.SCHEDULE_EDIT_ALL, Permissions.SCHEDULE_EDIT_DEPARTMENT],
  [Permissions.SCHEDULE_EDIT_DEPARTMENT, Permissions.SCHEDULE_EDIT_SELF],

  // Employees manage -> view + edit + delete + reset-password
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_VIEW],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_EDIT],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_DELETE],
  [Permissions.EMPLOYEES_MANAGE, Permissions.EMPLOYEES_RESET_PASSWORD],
  [Permissions.EMPLOYEES_MANAGE_SENSITIVE, Permissions.EMPLOYEES_VIEW_SENSITIVE],
  [Permissions.EMPLOYEES_MANAGE, Permissions.FILES_UPLOAD],

  // Tasks global ? self
  [Permissions.TASKS_VIEW, Permissions.TASKS_VIEW_SELF],

  // Locations manage permissions imply view
  [Permissions.LOCATIONS_EDIT, Permissions.LOCATIONS_VIEW],
  [Permissions.LOCATIONS_CREATE, Permissions.LOCATIONS_VIEW],
  [Permissions.LOCATIONS_DELETE, Permissions.LOCATIONS_VIEW],

  // Payroll manage permissions imply view
  [Permissions.PAYROLL_EDIT, Permissions.PAYROLL_VIEW],
  [Permissions.PAYROLL_MANAGE_PERIODS, Permissions.PAYROLL_VIEW],
  [Permissions.PAYROLL_MANAGE_PAYSLIPS, Permissions.PAYROLL_VIEW],

  // Leave approval implies view
  [Permissions.LEAVE_APPROVE, Permissions.LEAVE_VIEW],

  // Chat send implies view
  [Permissions.CHAT_SEND, Permissions.CHAT_VIEW],

  // Asset management: manage permissions imply view; approve implies request view
  [Permissions.ASSET_CATALOG_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_INVENTORY_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_ISSUE_MANAGE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_REQUEST_APPROVE, Permissions.ASSET_VIEW],
  [Permissions.ASSET_VIEW, Permissions.ASSET_VIEW_SELF],
  // Offboarding
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_VIEW],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_IT],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_HR],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_FINANCE],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_MANAGER],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_CLEARANCE_SECURITY],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_EXIT_INTERVIEW],
  [Permissions.OFFBOARDING_EDIT, Permissions.OFFBOARDING_COMPLETE],
] as const;
