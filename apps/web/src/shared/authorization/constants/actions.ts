export const ACTIONS = {
  EMPLOYEE: {
    CREATE: 'employee.create',
    EDIT: 'employee.edit',
    DELETE: 'employee.delete',
    RESET_PASSWORD: 'employee.resetPassword',
  },
  LEAVE: {
    APPROVE: 'leave.approve',
    REJECT: 'leave.reject',
  },
  PAYROLL: {
    APPROVE: 'payroll.approve',
    EXPORT: 'payroll.export',
  },
} as const;
