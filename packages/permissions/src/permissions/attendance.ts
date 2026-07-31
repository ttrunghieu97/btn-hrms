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
  timesheetApprove: 'attendance:timesheet:approve',
  timesheetImport: 'attendance:timesheet:import',
  periodView: 'attendance:period:view',
  periodReview: 'attendance:period:review',
  periodApprove: 'attendance:period:approve',
  periodLock: 'attendance:period:lock',
  periodUnlock: 'attendance:period:unlock',
  periodClose: 'attendance:period:close',
} as const;

export const attendanceHierarchy: readonly string[] = [
  'attendance:view:self',
  'attendance:view:department',
  'attendance:view:all',
] as const;
