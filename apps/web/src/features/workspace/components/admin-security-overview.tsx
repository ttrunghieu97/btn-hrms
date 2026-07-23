'use client';

import { MetricCard } from '@/components/platform';

interface AdminSecurityData {
  totalUsers: number;
  activeSessions: number;
  failedLoginsToday: number;
  permissionChanges: number;
}

interface AdminSecurityOverviewProps {
  data?: AdminSecurityData;
  isLoading?: boolean;
}

export function AdminSecurityOverview({ data, isLoading }: AdminSecurityOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Users" value="—" />
        <MetricCard title="Active Sessions" value="—" />
        <MetricCard title="Failed Logins Today" value="—" />
        <MetricCard title="Permission Changes" value="—" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Security Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Users" value={data.totalUsers.toLocaleString()} />
        <MetricCard title="Active Sessions" value={data.activeSessions} />
        <MetricCard
          title="Failed Logins Today"
          value={data.failedLoginsToday}
          subtitle={data.failedLoginsToday > 5 ? 'Review activity' : undefined}
        />
        <MetricCard title="Permission Changes" value={data.permissionChanges} subtitle="Today" />
      </div>
    </div>
  );
}
