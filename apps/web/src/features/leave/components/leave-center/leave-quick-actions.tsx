'use client';

import { QuickActionCard } from '@/components/platform';
import type { QuickAction } from '@/components/platform';

export function LeaveQuickActions() {
  const actions: QuickAction[] = [
    {
      id: 'request-leave',
      label: 'Request Leave',
      description: 'Submit a new leave request',
      href: '/leave/requests/new',
    },
    {
      id: 'my-leave',
      label: 'My Leave History',
      description: 'View past and pending requests',
      href: '/leave/requests',
    },
    {
      id: 'leave-policy',
      label: 'Leave Policy',
      description: 'Company leave policies',
      href: '/leave/policies',
    },
  ];

  return <QuickActionCard title="Leave Actions" actions={actions} />;
}
