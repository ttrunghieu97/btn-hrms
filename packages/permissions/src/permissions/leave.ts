export const leave = {
  view: 'leave:view',
  create: 'leave:create',
  edit: 'leave:edit',
  approve: 'leave:approve',
  balanceView: 'leave-balance:view',
  viewSelf: 'leave:view:self',
  viewDepartment: 'leave:view:department',
  viewAll: 'leave:view:all',
  approveDepartment: 'leave:approve:department',
} as const;

export const leaveHierarchy: readonly string[] = [
  'leave:view:self',
  'leave:view:department',
  'leave:view:all',
] as const;
