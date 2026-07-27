export const ROUTES = {
  OVERVIEW: "/overview",
  EMPLOYEES: "/employees",
  EMPLOYEES_NEW: "/employees/new",
  EMPLOYEES_DETAIL: "/employees/:id",
  EMPLOYEES_CONTRACTS: "/employees/contracts",
  EMPLOYEES_DOCUMENTS: "/employees/documents",
  ORGANIZATION: "/organization",
  ATTENDANCE: "/attendance",
  ATTENDANCE_LOGS: "/attendance/logs",
  ATTENDANCE_ANALYTICS: "/attendance/analytics",
  LEAVE: "/leave",
  LEAVE_REQUESTS: "/leave/requests",
  LEAVE_BALANCES: "/leave/balances",
  SCHEDULE: "/schedule",
  PAYROLL: "/payroll",
  PAYROLL_RUNS: "/payroll/runs",
  PAYROLL_PAYSLIPS: "/payroll/payslips",
  SETTINGS: "/settings",
  RECRUITMENT: "/recruitment/requisitions",
  ASSET_MANAGEMENT: "/asset-management/catalog",
  BENEFITS: "/benefits/plans",
  EXPENSES: "/expenses",
  PERFORMANCE: "/performance/cycles",
  LEARNING: "/learning/courses",
  ONBOARDING: "/onboarding",
  OFFBOARDING: "/offboarding",
  TASKS: "/tasks",
  CHAT: "/chat",
  MONITORING: "/monitoring",
  ADMINISTRATION: "/administration",
  ACCOUNT_PROFILE: "/account/profile",
  ACCOUNT_NOTIFICATIONS: "/account/notifications",
  CHANGE_PASSWORD: "/change-password",
} as const;

export const RESOURCES = {
  EMPLOYEE: {
    COMPENSATION: "employee.compensation",
    DOCUMENTS: "employee.documents",
    EQUIPMENT: "employee.equipment",
    CONTRACTS: "employee.contracts",
  },
} as const;

export const ACTIONS = {
  EMPLOYEE: {
    CREATE: "employee.create",
    EDIT: "employee.edit",
    DELETE: "employee.delete",
    RESET_PASSWORD: "employee.resetPassword",
  },
} as const;
