export const attendance = {
  check: 'attendance:check',
  viewSelf: 'attendance:view:self',
  viewDepartment: 'attendance:view:department',
  viewAll: 'attendance:view:all',
  report: 'attendance:report',
  overtimeSubmit: 'attendance:overtime:submit',
  overtimeApprove: 'attendance:overtime:approve',
} as const;

export const attendanceHierarchy: readonly string[] = [
  'attendance:view:self',
  'attendance:view:department',
  'attendance:view:all',
] as const;
