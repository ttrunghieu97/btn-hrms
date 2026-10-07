import type { SearchProvider, SearchResult } from '../types';

/**
 * Quick navigation provider — pages and sections.
 * Phase 1: static nav items. Phase 2: server-driven nav.
 */
const navItems: SearchResult[] = [
  { id: 'nav-workspace', type: 'notification', title: 'My Workspace', subtitle: 'Home', href: '/workspace' },
  { id: 'nav-employees', type: 'employee', title: 'Employees', subtitle: 'All employees', href: '/employees' },
  { id: 'nav-leave', type: 'leave', title: 'Leave', subtitle: 'Requests and balance', href: '/leave' },
  { id: 'nav-attendance', type: 'approval', title: 'Attendance', subtitle: 'Check-in and history', href: '/attendance/history' },
  { id: 'nav-payroll', type: 'payroll', title: 'Payroll', subtitle: 'Payslips and salary', href: '/payroll' },
  { id: 'nav-contracts', type: 'contract', title: 'Contracts', subtitle: 'Employment contracts', href: '/contracts' },
  { id: 'nav-approvals', type: 'approval', title: 'Approvals', subtitle: 'Pending approvals', href: '/approval/inbox' },
  { id: 'nav-onboarding', type: 'task', title: 'Onboarding', subtitle: 'New employee onboarding', href: '/onboarding' },
  { id: 'nav-offboarding', type: 'task', title: 'Offboarding', subtitle: 'Employee exits', href: '/offboarding' },
  { id: 'nav-notifications', type: 'notification', title: 'Notifications', subtitle: 'Alerts and updates', href: '/notifications' },
];

export const navigationSearchProvider: SearchProvider = {
  id: 'navigation',
  label: 'Navigation',
  search: async (query: string): Promise<SearchResult[]> => {
    const q = query.toLowerCase();
    if (!q) return navItems.slice(0, 5);
    return navItems.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle ?? '').toLowerCase().includes(q),
    );
  },
};
