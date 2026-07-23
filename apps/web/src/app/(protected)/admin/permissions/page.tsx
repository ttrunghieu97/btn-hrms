'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightCard, AttentionCard, QuickActionCard, MetricCard } from '@/components/platform';
import type { QuickAction } from '@/components/platform';

/**
 * Permission Management hub.
 * Route: /admin/permissions
 * Access: admin, super_admin
 *
 * Composes existing roles/permissions features into a unified admin view.
 */
export default function AdminPermissionsPage() {
  const stats = useMemo(() => ({
    totalRoles: 12,
    totalPermissions: 86,
    usersWithCustomRoles: 24,
  }), []);

  const attentionItems = useMemo(() => [], []);

  const quickActions: QuickAction[] = [
    { id: 'manage-roles', label: 'Manage Roles', description: 'Create, edit, and delete roles', href: '/administration/roles' },
    { id: 'edit-permissions', label: 'Edit Permissions', description: 'Configure role permissions', href: '/administration/roles' },
    { id: 'user-access', label: 'User Access', description: 'View and manage user permissions', href: '/administration/users' },
  ];

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Permission Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage roles, permissions, and user access across the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Roles" value={stats.totalRoles} />
        <MetricCard title="Total Permissions" value={stats.totalPermissions} />
        <MetricCard title="Custom Role Users" value={stats.usersWithCustomRoles} />
      </div>

      {/* Key actions */}
      <QuickActionCard title="Permission Actions" actions={quickActions} />

      {/* Permission matrix preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Permission Matrix Preview</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Permission</th>
                <th className="py-2 px-3 font-medium text-center">Employee</th>
                <th className="py-2 px-3 font-medium text-center">Manager</th>
                <th className="py-2 px-3 font-medium text-center">HR</th>
                <th className="py-2 px-3 font-medium text-center">Admin</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'employee:view', emp: true, mgr: true, hr: true, admin: true },
                { name: 'employee:create', emp: false, mgr: false, hr: true, admin: true },
                { name: 'employee:delete', emp: false, mgr: false, hr: false, admin: true },
                { name: 'leave:approve', emp: false, mgr: true, hr: true, admin: true },
                { name: 'payroll:view', emp: true, mgr: false, hr: true, admin: true },
                { name: 'payroll:manage', emp: false, mgr: false, hr: false, admin: true },
                { name: 'attendance:view', emp: true, mgr: true, hr: true, admin: true },
                { name: 'attendance:manage', emp: false, mgr: true, hr: true, admin: true },
                { name: 'sys:all', emp: false, mgr: false, hr: false, admin: true },
              ].map((perm) => (
                <tr key={perm.name} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-[11px]">{perm.name}</td>
                  {(['emp', 'mgr', 'hr', 'admin'] as const).map((role) => (
                    <td key={role} className="py-2 px-3 text-center">
                      {perm[role]
                        ? <span className="text-green-600 font-bold">✓</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
