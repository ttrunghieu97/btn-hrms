'use client';

import { useMemo } from 'react';
import { useWorkspaceRole } from '../queries';
import type { QuickAction } from '../types';
import { QuickActionCard } from '@/components/platform';

const roleActions: Record<string, QuickAction[]> = {
  employee: [
    { id: 'leave', label: 'Request Leave', description: 'Submit a leave request', href: '/leave', permission: 'leave:create' },
    { id: 'payslip', label: 'View Payslip', description: 'Latest pay slip', href: '/payroll/payslips', permission: 'payroll:view' },
    { id: 'profile', label: 'Update Profile', description: 'Personal information', href: '/account/profile' },
    { id: 'attendance', label: 'Attendance', description: 'View attendance history', href: '/attendance/history' },
  ],
  manager: [
    { id: 'approvals', label: 'Approvals', description: 'Pending team approvals', href: '/approval/inbox' },
    { id: 'team', label: 'My Team', description: 'Team overview', href: '/employees' },
    { id: 'leave', label: 'Request Leave', href: '/leave' },
  ],
  hr: [
    { id: 'employees', label: 'Employees', description: 'All employees', href: '/employees' },
    { id: 'onboarding', label: 'Onboarding', href: '/onboarding' },
    { id: 'reports', label: 'Reports', href: '/analytics' },
  ],
};

export function QuickActions() {
  const role = useWorkspaceRole();
  const actions = useMemo(() => roleActions[role] ?? roleActions.employee, [role]);

  return (
    <QuickActionCard
      title="Quick Actions"
      actions={actions}
    />
  );
}
