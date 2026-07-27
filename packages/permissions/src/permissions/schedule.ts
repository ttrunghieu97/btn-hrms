export const schedule = {
  viewSelf: 'schedule:view:self',
  viewDepartment: 'schedule:view:department',
  viewAll: 'schedule:view:all',
  editSelf: 'schedule:edit:self',
  editDepartment: 'schedule:edit:department',
  editAll: 'schedule:edit:all',
  create: 'schedule:create',
  delete: 'schedule:delete',
  copy: 'schedule:copy',
} as const;

export const scheduleViewHierarchy: readonly string[] = [
  'schedule:view:self',
  'schedule:view:department',
  'schedule:view:all',
] as const;

export const scheduleEditHierarchy: readonly string[] = [
  'schedule:edit:self',
  'schedule:edit:department',
  'schedule:edit:all',
] as const;
