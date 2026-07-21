import { appCopy } from '@/lib/app-copy';
import type { NavGroup } from '@/types';
import { permissions } from '@/lib/permissions';

export const navGroups: NavGroup[] = [
  {
    label: appCopy.nav.groups.overview,
    items: [
      {
        title: appCopy.nav.items.overview,
        url: '/overview',
        icon: 'dashboard',
        isActive: false,
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
        items: [],
        access: { permissions: ['employees:view:self', 'employees:view:department', 'employees:view:all'] }
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
        visible: true,
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
        items: [],
        access: { permissions: ['profile:view'] }
      },
      {
        title: appCopy.nav.items.notifications,
        url: '/account/notifications',
        icon: 'notification',
        shortcut: ['n', 'n'],
        isActive: false,
        disabled: false,
        visible: true,
        items: [],
        access: { permissions: ['notifications:view'] }
      },
      {
        title: appCopy.nav.items.changePassword,
        url: '/change-password',
        icon: 'lock',
        isActive: false,
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
        items: [],
        access: {
          permissions: ['offboarding:view']
        }
      }
    ]
  }
];
