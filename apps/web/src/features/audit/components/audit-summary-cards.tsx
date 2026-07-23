'use client';

import { MetricCard } from '@/components/platform';

interface AuditSummary {
  failedLogins: number;
  permissionChanges: number;
  roleAssignments: number;
  policyUpdates: number;
}

interface AuditSummaryCardsProps {
  data?: AuditSummary;
  isLoading?: boolean;
}

export function AuditSummaryCards({ data, isLoading }: AuditSummaryCardsProps) {
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
        <MetricCard title="Failed Logins" value="—" />
        <MetricCard title="Permission Changes" value="—" />
        <MetricCard title="Role Assignments" value="—" />
        <MetricCard title="Policy Updates" value="—" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Failed Logins"
        value={data.failedLogins}
        subtitle="Last 24 hours"
      />
      <MetricCard
        title="Permission Changes"
        value={data.permissionChanges}
        subtitle="Last 7 days"
      />
      <MetricCard
        title="Role Assignments"
        value={data.roleAssignments}
        subtitle="Last 7 days"
      />
      <MetricCard
        title="Policy Updates"
        value={data.policyUpdates}
        subtitle="Last 7 days"
      />
    </div>
  );
}
