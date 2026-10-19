import { appCopy } from '@/lib/app-copy';
import type { NavGroup } from '@/types';
import { permissions } from '@/lib/permissions';
import { isModuleNavVisible } from '@/config/module-rollout';

export const navGroups: NavGroup[] = [
  {
    label: appCopy.nav.groups.overview,
    items: [
      {
        title: appCopy.nav.items.overview,
        url: '/overview',
        icon: 'dashboard',
        isActive: false,
        visible: isModuleNavVisible('overview'),
        shortcut: ['d', 'd'],
        items: [],
        access: { permissions: ['dashboard:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.employees,
    items: [
      {
        title: appCopy.nav.items.employees,
        url: '/employees',
        icon: 'employee',
        shortcut: ['e', 'm'],
        isActive: false,
        visible: isModuleNavVisible('employees'),
        items: [],
        access: { permissions: ['employees:view:department', 'employees:view:all', 'employees:view', 'employees:view:self'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.organization,
    items: [
      {
        title: appCopy.nav.items.organization,
        url: '/organization',
        icon: 'department',
        isActive: false,
        visible: isModuleNavVisible('organization'),
        items: [],
        access: {
          permissions: ['organization:view']
        }
      }
    ]
  },
  {
    label: appCopy.nav.groups.attendance,
    items: [
      {
        title: appCopy.nav.items.attendance,
        url: '/attendance',
        icon: 'calendar',
        isActive: false,
        visible: isModuleNavVisible('attendance'),
        items: [],
        access: {
          permissions: [
            'attendance:view:self',
            'attendance:view:department',
            'attendance:view:all'
          ]
        }
      }
    ]
  },
  {
    label: appCopy.nav.groups.leave,
    items: [
      {
        title: appCopy.nav.items.leave,
        url: '/leave',
        icon: 'page',
        isActive: false,
        visible: isModuleNavVisible('leave'),
        items: [],
        access: {
          permissions: [
            'leave:view:self',
            'leave:view:department',
            'leave:view:all'
          ]
        }
      }
    ]
  },
  {
    label: appCopy.nav.groups.recruitment,
    items: [
      {
        title: appCopy.nav.items.recruitment,
        url: '/recruitment/requisitions',
        icon: 'people',
        isActive: false,
        visible: isModuleNavVisible('recruitment'),
        items: [],
        access: { permissions: ['recruitment:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.assetManagement,
    items: [
      {
        title: appCopy.nav.items.assetManagement,
        url: '/asset-management/catalog',
        icon: 'product',
        isActive: false,
        visible: isModuleNavVisible('asset-management'),
        items: [],
        access: { permissions: ['asset:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.benefits,
    items: [
      {
        title: appCopy.nav.items.benefits,
        url: '/benefits/plans',
        icon: 'shieldCheck',
        isActive: false,
        visible: isModuleNavVisible('benefits'),
        items: [],
        access: { permissions: ['benefits:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.expenses,
    items: [
      {
        title: appCopy.nav.items.expenses,
        url: '/expenses',
        icon: 'page',
        isActive: false,
        visible: isModuleNavVisible('expenses'),
        items: [],
        access: { permissions: ['expenses:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.performance,
    items: [
      {
        title: appCopy.nav.items.performance,
        url: '/performance/cycles',
        icon: 'trophy',
        isActive: false,
        visible: isModuleNavVisible('performance'),
        items: [],
        access: { permissions: ['performance:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.learning,
    items: [
      {
        title: appCopy.nav.items.learning,
        url: '/learning/courses',
        icon: 'school',
        isActive: false,
        visible: isModuleNavVisible('learning'),
        items: [],
        access: { permissions: ['learning:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.onboarding,
    items: [
      {
        title: appCopy.nav.items.onboarding,
        url: '/onboarding',
        icon: 'exclusive',
        isActive: false,
        visible: isModuleNavVisible('onboarding'),
        items: [],
        access: { permissions: ['onboarding:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.schedule,
    items: [
      {
        title: appCopy.nav.items.schedule,
        url: '/schedule',
        icon: 'calendar',
        isActive: false,
        visible: isModuleNavVisible('schedule'),
        items: [],
        access: { permissions: ['schedule:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.tasks,
    items: [
      {
        title: appCopy.nav.items.tasks,
        url: '/tasks',
        icon: 'task',
        shortcut: ['t', 'k'],
        isActive: false,
        visible: isModuleNavVisible('tasks'),
        items: [],
        access: { permissions: ['tasks:view'] }
      },
      {
        title: appCopy.nav.items.chat,
        url: '/chat',
        icon: 'chat',
        shortcut: ['c', 'c'],
        isActive: false,
        disabled: false,
        visible: isModuleNavVisible('tasks'),
        items: [],
        access: { permissions: ['chat:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.monitoring,
    items: [
      {
        title: appCopy.nav.items.monitoring,
        url: '/monitoring',
        icon: 'activity',
        isActive: false,
        visible: isModuleNavVisible('monitoring'),
        items: [],
        access: { permissions: ['monitoring:view'] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.payroll,
    items: [
      {
        title: appCopy.nav.items.payroll,
        url: '/payroll',
        icon: 'page',
        isActive: false,
        visible: isModuleNavVisible('payroll'),
        items: [],
        access: {
          permissions: ['payroll:view']
        }
      }
    ]
  },
  {
    label: appCopy.nav.groups.administration,
    items: [
      {
        title: appCopy.nav.items.administration,
        url: '/administration',
        icon: 'settings',
        isActive: false,
        visible: isModuleNavVisible('administration'),
        items: [],
        access: {
          permissions: [
            'users:view',
            'users:edit',
            'approval-policies:view',
            'approval-requests:view'
          ]
        }
      }
    ]
  },
  {
    label: appCopy.nav.groups.account,
    items: [
      {
        title: appCopy.nav.items.profile,
        url: '/account/profile',
        icon: 'profile',
        shortcut: ['m', 'm'],
        isActive: false,
        visible: isModuleNavVisible('account'),
        items: [],
        access: { permissions: ['profile:view', 'employees:view:self'] }
      },
      {
        title: appCopy.nav.items.notifications,
        url: '/account/notifications',
        icon: 'notification',
        shortcut: ['n', 'n'],
        isActive: false,
        disabled: false,
        visible: isModuleNavVisible('account'),
        items: [],
        access: { permissions: ['notifications:view'] }
      },
      {
        title: appCopy.nav.items.changePassword,
        url: '/account/change-password',
        icon: 'lock',
        isActive: false,
        visible: isModuleNavVisible('account'),
        items: [],
        access: { permissions: [permissions.auth.changePassword] }
      }
    ]
  },
  {
    label: appCopy.nav.groups.offboarding,
    items: [
      {
        title: appCopy.nav.items.offboarding,
        url: '/offboarding',
        icon: 'logout',
        isActive: false,
        visible: isModuleNavVisible('offboarding'),
        items: [],
        access: {
          permissions: ['offboarding:view']
        }
      }
    ]
  }
];
