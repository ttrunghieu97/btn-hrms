'use client';

import { QuickActionCard } from '@/components/platform';
import type { QuickAction } from '@/components/platform';

export function AdminQuickActions() {
  const actions: QuickAction[] = [
    { id: 'users', label: 'Manage Users', description: 'User accounts and profiles', href: '/administration/users' },
    { id: 'roles', label: 'Manage Roles', description: 'Role definitions and permissions', href: '/administration/roles' },
    { id: 'approval', label: 'Approval Config', description: 'Policy and workflow configuration', href: '/administration/approval' },
    { id: 'audit', label: 'View Audit Logs', description: 'Authorization and activity audit', href: '/administration/users' },
    { id: 'health', label: 'System Health', description: 'Service status and readiness', href: '/admin' },
    { id: 'settings', label: 'System Settings', description: 'Platform configuration', href: '/administration' },
  ];

  return <QuickActionCard title="Administration" actions={actions} />;
}
