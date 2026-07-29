export const attendance = {
  check: 'attendance:check',
  viewSelf: 'attendance:view:self',
  viewDepartment: 'attendance:view:department',
  viewAll: 'attendance:view:all',
  report: 'attendance:report',
  overtimeSubmit: 'attendance:overtime:submit',
  overtimeApprove: 'attendance:overtime:approve',
  timesheetView: 'attendance:timesheet:view',
  timesheetManage: 'attendance:timesheet:manage',
  periodLockManage: 'attendance:period-lock:manage',
  periodUnlockManage: 'attendance:period-unlock:manage',
} as const;

export const attendanceHierarchy: readonly string[] = [
  'attendance:view:self',
  'attendance:view:department',
  'attendance:view:all',
] as const;
