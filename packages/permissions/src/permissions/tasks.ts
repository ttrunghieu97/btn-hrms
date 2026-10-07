export const tasks = {
  view: 'tasks:view',
  viewSelf: 'tasks:view:self',
  create: 'tasks:create',
  edit: 'tasks:edit',
  delete: 'tasks:delete',
  assign: 'tasks:assign',
} as const;

export const taskHierarchy: readonly string[] = [
  'tasks:view:self',
  'tasks:view',
] as const;
