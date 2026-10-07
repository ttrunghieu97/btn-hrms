'use client';

import { useMemo } from 'react';
import {
  AdminSystemHealth,
  AdminSecurityOverview,
  AdminQuickActions,
} from '@/features/workspace';
import { ActivityCenterFeed } from '@/components/platform';

/**
 * Platform Administration workspace.
 * Route: /admin
 * Access: admin, super_admin roles
 */
export default function AdminPage() {
  const healthStatus = useMemo(() => ({
    api: 'up' as const,
    database: 'up' as const,
    storage: 'up' as const,
    queue: 'up' as const,
  }), []);

  const securityData = useMemo(() => ({
    totalUsers: 1245,
    activeSessions: 342,
    failedLoginsToday: 12,
    permissionChanges: 5,
  }), []);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform Administration</h1>
        <p className="text-sm text-muted-foreground">
          System status, security, and configuration management.
        </p>
      </div>

      {/* System health */}
      <section className="space-y-3">
        <AdminSystemHealth status={healthStatus} />
      </section>

      {/* Security overview */}
      <section className="space-y-3">
        <AdminSecurityOverview data={securityData} />
      </section>

      {/* Recent security activity */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        <ActivityCenterFeed limit={5} types={['security', 'system']} showFilters={false} />
      </section>

      {/* Admin actions */}
      <section className="space-y-3">
        <AdminQuickActions />
      </section>
    </div>
  );
}
