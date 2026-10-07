export const DashboardWidgetId = {
  HEADCOUNT: 'headcount',
  EMPLOYEE_STATUS: 'employee-status',
  DEPARTMENT_HEADCOUNT: 'department-headcount',
  HIRES_VS_LEAVERS: 'hires-vs-leavers',
  ATTENDANCE_TODAY: 'attendance-today',
  PENDING_LEAVE_REQUESTS: 'pending-leave-requests',
  PAYROLL_COST_TREND: 'payroll-cost-trend',
  ATTENDANCE_EXCEPTIONS: 'attendance-exceptions',
  PENDING_APPROVALS: 'pending-approvals',
  COMPLIANCE_STATUS: 'compliance-status',
  TEAM_ATTENDANCE: 'team-attendance',
  TEAM_LEAVE: 'team-leave',
} as const;

export type DashboardWidgetId = (typeof DashboardWidgetId)[keyof typeof DashboardWidgetId];
