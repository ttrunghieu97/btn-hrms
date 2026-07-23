'use client';

import { QuickActionCard } from '@/components/platform';
import type { QuickAction } from '@/components/platform';

export function HrActionCenter() {
  const actions: QuickAction[] = [
    { id: 'add-employee', label: 'Add Employee', description: 'Create new employee profile', href: '/employees/new' },
    { id: 'onboarding', label: 'Onboarding', description: 'Manage incoming employees', href: '/onboarding' },
    { id: 'offboarding', label: 'Offboarding', description: 'Process exits', href: '/offboarding' },
    { id: 'payroll', label: 'Run Payroll', description: 'Process payroll cycle', href: '/payroll' },
    { id: 'contracts', label: 'Contracts', description: 'View and manage contracts', href: '/contracts' },
    { id: 'reports', label: 'Reports', description: 'Workforce analytics', href: '/analytics' },
  ];

  return <QuickActionCard title="HR Actions" actions={actions} />;
}
