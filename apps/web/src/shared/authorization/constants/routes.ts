export const PUBLIC_ROUTES = {
  SIGN_IN: '/auth/sign-in',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  UNAUTHORIZED: '/unauthorized',
  SERVICE_UNAVAILABLE: '/service-unavailable',
  ACCOUNT_NO_PERMISSIONS: '/account/no-permissions',
} as const;

export const ROUTES = {
  OVERVIEW: '/overview',
  EMPLOYEES: '/employees',
  EMPLOYEES_NEW: '/employees/new',
  EMPLOYEES_DETAIL: '/employees/:id',
  EMPLOYEES_CONTRACTS: '/employees/contracts',
  EMPLOYEES_DOCUMENTS: '/employees/documents',
  ORGANIZATION: '/organization',
  ATTENDANCE: '/attendance',
  ATTENDANCE_LOGS: '/attendance/logs',
  ATTENDANCE_ANALYTICS: '/attendance/analytics',
  LEAVE: '/leave',
  LEAVE_REQUESTS: '/leave/requests',
  LEAVE_BALANCES: '/leave/balances',
  PAYROLL: '/payroll',
  PAYROLL_RUNS: '/payroll/runs',
  PAYROLL_PAYSLIPS: '/payroll/payslips',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
