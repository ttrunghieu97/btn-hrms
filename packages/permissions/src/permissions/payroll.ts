export const payroll = {
  view: 'payroll:view',
  edit: 'payroll:edit',
  managePeriods: 'payroll:manage_periods',
  managePayslips: 'payroll:manage_payslips',
  viewSelf: 'payroll:view:self',
  viewAll: 'payroll:view:all',
  manage: 'payroll:manage:all',
} as const;

export const payrollHierarchy: readonly string[] = [
  'payroll:view:self',
  'payroll:view:all',
] as const;
