/**
 * Central route → permission registry.
 * Single source for route-level authorization + navigation.
 *
 * Routes with `nav` metadata appear in the sidebar.
 * Nav auto-syncs: permission changes here → sidebar updates automatically.
 */
import type { PermissionRule } from '@/lib/permission-resolver';

export type NavIcon =
  | 'dashboard' | 'employee' | 'department' | 'calendar'
  | 'page' | 'people' | 'product' | 'shieldCheck'
  | 'trophy' | 'school' | 'exclusive' | 'task'
  | 'chat' | 'activity' | 'settings' | 'profile'
  | 'notification' | 'lock' | 'logout';

export interface NavMeta {
  /** Display title in sidebar */
  title: string;
  /** Sidebar icon key */
  icon: NavIcon;
  /** Group label for grouping in sidebar */
  group: string;
}

export interface RouteDef {
  /** Route path, e.g. "/employees/:id" */
  path: string;
  /** Permission required (compound rule) */
  permission: PermissionRule;
  /** Navigation metadata — present = visible in sidebar */
  nav?: NavMeta;
  /** Internal label for debugging */
  label?: string;
}

export const routeRegistry: readonly RouteDef[] = [
  // ── Overview ──────────────────────────────────────────────────────────
  {
    path: '/overview',
    permission: { anyOf: ['dashboard:view'] },
    nav: { title: 'Tổng quan', icon: 'dashboard', group: 'Tổng quan' },
  },

  // ── Employees ─────────────────────────────────────────────────────────
  {
    path: '/employees',
    permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] },
    nav: { title: 'Nhân viên', icon: 'employee', group: 'Nhân sự' },
  },
  {
    path: '/employees/new',
    permission: { anyOf: ['employee:create'] },
  },
  {
    path: '/employees/:id',
    permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] },
  },
  {
    path: '/employees/contracts',
    permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] },
  },
  {
    path: '/employees/documents',
    permission: { anyOf: ['employee:view', 'employee:view:self', 'employee:view:department', 'employee:view:all'] },
  },

  // ── Organization ──────────────────────────────────────────────────────
  {
    path: '/organization',
    permission: { anyOf: ['organization:view'] },
    nav: { title: 'Cơ cấu tổ chức', icon: 'department', group: 'Nhân sự' },
  },

  // ── Attendance ────────────────────────────────────────────────────────
  {
    path: '/attendance',
    permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] },
    nav: { title: 'Chấm công', icon: 'calendar', group: 'Nhân sự' },
  },

  // ── Leave ─────────────────────────────────────────────────────────────
  {
    path: '/leave',
    permission: { anyOf: ['leave:view:self', 'leave:view:department', 'leave:view:all'] },
    nav: { title: 'Nghỉ phép', icon: 'page', group: 'Nhân sự' },
  },

  // ── Schedule ──────────────────────────────────────────────────────────
  {
    path: '/schedule',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
    nav: { title: 'Lịch làm việc', icon: 'calendar', group: 'Nhân sự' },
  },

  // ── Recruitment ───────────────────────────────────────────────────────
  {
    path: '/recruitment/requisitions',
    permission: { anyOf: ['recruitment:view'] },
    nav: { title: 'Tuyển dụng', icon: 'people', group: 'Nhân sự' },
  },

  // ── Asset Management ──────────────────────────────────────────────────
  {
    path: '/asset-management/catalog',
    permission: { anyOf: ['asset:view'] },
    nav: { title: 'Quản lý tài sản', icon: 'product', group: 'Tài chính' },
  },

  // ── Benefits ──────────────────────────────────────────────────────────
  {
    path: '/benefits/plans',
    permission: { anyOf: ['benefits:view'] },
    nav: { title: 'Phúc lợi', icon: 'shieldCheck', group: 'Tài chính' },
  },

  // ── Expenses ──────────────────────────────────────────────────────────
  {
    path: '/expenses',
    permission: { anyOf: ['expenses:view'] },
    nav: { title: 'Chi phí', icon: 'page', group: 'Tài chính' },
  },

  // ── Performance ───────────────────────────────────────────────────────
  {
    path: '/performance/cycles',
    permission: { anyOf: ['performance:view'] },
    nav: { title: 'Đánh giá', icon: 'trophy', group: 'Nhân sự' },
  },

  // ── Learning ──────────────────────────────────────────────────────────
  {
    path: '/learning/courses',
    permission: { anyOf: ['learning:view'] },
    nav: { title: 'Đào tạo', icon: 'school', group: 'Nhân sự' },
  },

  // ── Onboarding ────────────────────────────────────────────────────────
  {
    path: '/onboarding',
    permission: { anyOf: ['onboarding:view'] },
    nav: { title: 'Hội nhập', icon: 'exclusive', group: 'Nhân sự' },
  },

  // ── Offboarding ───────────────────────────────────────────────────────
  {
    path: '/offboarding',
    permission: { anyOf: ['offboarding:view'] },
    nav: { title: 'Thôi việc', icon: 'logout', group: 'Nhân sự' },
  },

  // ── Payroll ───────────────────────────────────────────────────────────
  {
    path: '/payroll',
    permission: { anyOf: ['payroll:view', 'payroll:view:self', 'payroll:view:all'] },
    nav: { title: 'Bảng lương', icon: 'page', group: 'Tài chính' },
  },

  // ── Tasks & Chat ──────────────────────────────────────────────────────
  {
    path: '/tasks',
    permission: { anyOf: ['tasks:view'] },
    nav: { title: 'Công việc', icon: 'task', group: 'Khác' },
  },
  {
    path: '/chat',
    permission: { anyOf: ['chat:view'] },
    nav: { title: 'Trò chuyện', icon: 'chat', group: 'Khác' },
  },

  // ── Monitoring ────────────────────────────────────────────────────────
  {
    path: '/monitoring',
    permission: { anyOf: ['monitoring:view'] },
    nav: { title: 'Giám sát', icon: 'activity', group: 'Khác' },
  },

  // ── Administration ────────────────────────────────────────────────────
  {
    path: '/administration',
    permission: { anyOf: ['users:view', 'users:edit', 'approval-policies:view', 'approval-requests:view'] },
    nav: { title: 'Quản trị', icon: 'settings', group: 'Quản trị' },
  },

  // ── Account ───────────────────────────────────────────────────────────
  {
    path: '/account/profile',
    permission: { anyOf: ['profile:view', 'employees:view:self'] },
    nav: { title: 'Hồ sơ', icon: 'profile', group: 'Tài khoản' },
  },
  {
    path: '/account/notifications',
    permission: { anyOf: ['notifications:view:self'] },
    nav: { title: 'Thông báo', icon: 'notification', group: 'Tài khoản' },
  },
  {
    path: '/account/no-permissions',
    permission: {},
  },
  {
    path: '/change-password',
    permission: { anyOf: ['auth:change-password'] },
    nav: { title: 'Đổi mật khẩu', icon: 'lock', group: 'Tài khoản' },
  },
  {
    path: '/account/change-password',
    permission: { anyOf: ['auth:change-password'] },
  },

  // ── Sub-routes (no nav) ──────────────────────────────────────────────
  {
    path: '/activity',
    permission: { anyOf: ['dashboard:view'] },
  },
  {
    path: '/overview/operations',
    permission: { anyOf: ['dashboard:view'] },
  },
  {
    path: '/overview/executive',
    permission: { anyOf: ['dashboard:view'] },
  },
  {
    path: '/organization/departments',
    permission: { anyOf: ['organization:view'] },
  },
  {
    path: '/organization/positions',
    permission: { anyOf: ['organization:view'] },
  },
  {
    path: '/attendance/history',
    permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] },
  },
  {
    path: '/attendance/summary',
    permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] },
  },
  {
    path: '/attendance/analytics',
    permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] },
  },
  {
    path: '/attendance/management',
    permission: { anyOf: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] },
  },
  {
    path: '/leave/requests',
    permission: { anyOf: ['leave:view:self', 'leave:view:department', 'leave:view:all'] },
  },
  {
    path: '/schedule/my-schedule',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },
  {
    path: '/schedule/management',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },
  {
    path: '/schedule/roster',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },
  {
    path: '/schedule/requests',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },
  {
    path: '/recruitment/postings',
    permission: { anyOf: ['recruitment:view'] },
  },
  {
    path: '/recruitment/candidates',
    permission: { anyOf: ['recruitment:view'] },
  },
  {
    path: '/asset-management/inventory',
    permission: { anyOf: ['asset:view'] },
  },
  {
    path: '/asset-management/requests',
    permission: { anyOf: ['asset:view'] },
  },
  {
    path: '/asset-management/issues',
    permission: { anyOf: ['asset:view'] },
  },
  {
    path: '/benefits/enrollments',
    permission: { anyOf: ['benefits:view'] },
  },
  {
    path: '/performance/goals',
    permission: { anyOf: ['performance:view'] },
  },
  {
    path: '/performance/reviews',
    permission: { anyOf: ['performance:view'] },
  },
  {
    path: '/learning/paths',
    permission: { anyOf: ['learning:view'] },
  },
  {
    path: '/learning/sessions',
    permission: { anyOf: ['learning:view'] },
  },
  {
    path: '/learning/certifications',
    permission: { anyOf: ['learning:view'] },
  },
  {
    path: '/administration/users',
    permission: { anyOf: ['users:view'] },
  },
  {
    path: '/administration/roles',
    permission: { anyOf: ['roles:view'] },
  },
  {
    path: '/administration/roles/:id',
    permission: { anyOf: ['roles:view'] },
  },
  {
    path: '/administration/approval',
    permission: { anyOf: ['users:view', 'users:edit', 'approval-policies:view', 'approval-requests:view'] },
  },
  {
    path: '/monitoring/system-health',
    permission: { anyOf: ['monitoring:view'] },
  },
  {
    path: '/monitoring/activities',
    permission: { anyOf: ['monitoring:view'] },
  },
  {
    path: '/monitoring/data-integrity',
    permission: { anyOf: ['monitoring:view'] },
  },
  {
    path: '/notifications',
    permission: { anyOf: ['notifications:view:self'] },
  },

  // ── Admin ──────────────────────────────────────────────────────────────
  {
    path: '/admin',
    permission: { anyOf: ['users:view', 'users:edit'] },
  },
  {
    path: '/admin/permissions',
    permission: { anyOf: ['users:edit'] },
  },
  {
    path: '/admin/audit',
    permission: { anyOf: ['users:view'] },
  },
  {
    path: '/admin/integrations',
    permission: { anyOf: ['users:edit'] },
  },
  {
    path: '/admin/settings',
    permission: { anyOf: ['settings:view'] },
  },

  // ── Benefits ──────────────────────────────────────────────────────────
  {
    path: '/benefits',
    permission: { anyOf: ['benefits:view'] },
  },

  // ── Learning ──────────────────────────────────────────────────────────
  {
    path: '/learning',
    permission: { anyOf: ['learning:view'] },
  },

  // ── Leave sub-routes ──────────────────────────────────────────────────
  {
    path: '/leave/policies',
    permission: { anyOf: ['leave:view'] },
  },

  // ── Payroll sub-routes ────────────────────────────────────────────────
  {
    path: '/payroll/payslips',
    permission: { anyOf: ['payroll:view'] },
  },
  {
    path: '/payroll/payslips/:payslipId',
    permission: { anyOf: ['payroll:view'] },
  },
  {
    path: '/payroll/periods',
    permission: { anyOf: ['payroll:manage_periods'] },
  },
  {
    path: '/payroll/runs',
    permission: { anyOf: ['payroll:manage_periods'] },
  },
  {
    path: '/payroll/runs/:runId',
    permission: { anyOf: ['payroll:manage_periods'] },
  },
  {
    path: '/payroll/salary-structures',
    permission: { anyOf: ['payroll:edit'] },
  },

  // ── Performance ──────────────────────────────────────────────────────
  {
    path: '/performance',
    permission: { anyOf: ['performance:view'] },
  },

  // ── Recruitment ──────────────────────────────────────────────────────
  {
    path: '/recruitment',
    permission: { anyOf: ['recruitment:view'] },
  },

  // ── Schedule sub-routes ──────────────────────────────────────────────
  {
    path: '/schedule/rosters',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },
  {
    path: '/schedule/templates',
    permission: { anyOf: ['schedule:view:self', 'schedule:view:department', 'schedule:view:all'] },
  },

  // ── Workspace ────────────────────────────────────────────────────────
  {
    path: '/workspace',
    permission: { anyOf: ['tasks:view'] },
  },
  {
    path: '/workspace/hr',
    permission: { anyOf: ['tasks:view'] },
  },

  // ── Asset Management root ────────────────────────────────────────────
  {
    path: '/asset-management',
    permission: { anyOf: ['asset:view'] },
  },

  // ── Account root ─────────────────────────────────────────────────────
  {
    path: '/account',
    permission: {}, // authenticated only
  },
];
