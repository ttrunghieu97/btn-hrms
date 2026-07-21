export const permissions = {
  dashboard: {
    view: 'dashboard:view'
  },
  employees: {
    view: 'employees:view',
    viewSelf: 'employees:view:self',
    viewDepartment: 'employees:view:department',
    viewAll: 'employees:view:all',
    create: 'employees:create',
    edit: 'employees:edit',
    resetPassword: 'employees:reset-password',
  },
  departments: {
    view: 'departments:view',
    create: 'departments:create',
    edit: 'departments:edit'
  },
  attendance: {
    view: 'attendance:view:self',
    viewDepartment: 'attendance:view:department',
    viewAll: 'attendance:view:all',
    manage: 'attendance:view:all'
  },
  schedule: {
    view: 'schedule:view',
    manage: 'schedule:manage'
  },
  leave: {
    viewSelf: 'leave:view:self',
    viewDepartment: 'leave:view:department',
    viewAll: 'leave:view:all',
    create: 'leave:create',
    edit: 'leave:edit',
    approve: 'leave:approve',
  },
  profile: {
    view: 'profile:view',
    edit: 'profile:edit'
  },
  auth: {
    changePassword: 'auth:change-password'
  },
  roles: {
    view: 'roles:view',
    manage: 'users:edit'
  },
  users: {
    view: 'users:view',
    edit: 'users:edit'
  },
  notifications: {
    view: 'notifications:view'
  },
  chat: {
    view: 'chat:view'
  },
  tasks: {
    view: 'tasks:view',
    create: 'tasks:create',
    edit: 'tasks:edit',
    manage: 'tasks:manage'
  },
  products: {
    view: 'products:view'
  },
  company: {
    view: 'company:view'
  },
  billing: {
    view: 'billing:view'
  },
  demos: {
    view: 'sys:all'
  },
  monitoring: {
    view: 'monitoring:view'
  },
  recruitment: {
    view: 'recruitment:view',
    requisitionManage: 'recruitment:requisition:manage',
    requisitionApprove: 'recruitment:requisition:approve',
    postingManage: 'recruitment:posting:manage',
    candidateManage: 'recruitment:candidate:manage',
    pipelineManage: 'recruitment:pipeline:manage',
    offerManage: 'recruitment:offer:manage',
    offerApprove: 'recruitment:offer:approve'
  },
  assetManagement: {
    view: 'asset:view',
    catalog: 'asset:catalog:manage',
    inventory: 'asset:inventory:manage',
    request: 'asset:request:create',
    issue: 'asset:issue:manage'
  },
  benefits: {
    view: 'benefits:view',
    manage: 'benefits:manage'
  },
  expenses: {
    view: 'expenses:view',
    manage: 'expenses:manage'
  },
  performance: {
    view: 'performance:view',
    manage: 'performance:manage'
  },
  learning: {
    view: 'learning:view',
    manage: 'learning:manage'
  },
  onboarding: {
    view: 'onboarding:view',
    manage: 'onboarding:manage'
  },
  offboarding: {
    view: 'offboarding:view',
    manage: 'offboarding:manage',
    clearance: 'offboarding:clearance'
  }
} as const;

export type PermissionValue = {
  [K in keyof typeof permissions]: (typeof permissions)[K][keyof (typeof permissions)[K]];
}[keyof typeof permissions];
