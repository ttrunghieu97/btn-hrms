'use client';

import { MetricCard } from '@/components/platform';

interface WorkforceHealthData {
  total: number;
  active: number;
  probation: number;
  leaving: number;
  newThisMonth: number;
}

interface WorkforceHealthProps {
  data?: WorkforceHealthData;
  isLoading?: boolean;
}

export function WorkforceHealth({ data, isLoading }: WorkforceHealthProps) {
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
        <MetricCard title="Total Employees" value="—" />
        <MetricCard title="Active" value="—" />
        <MetricCard title="Probation" value="—" />
        <MetricCard title="Leaving" value="—" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Total Employees" value={data.total} subtitle={`+${data.newThisMonth} this month`} />
      <MetricCard title="Active" value={data.active} subtitle={`${((data.active / data.total) * 100).toFixed(0)}% of workforce`} />
      <MetricCard title="Probation" value={data.probation} subtitle="Pending confirmation" />
      <MetricCard title="Leaving" value={data.leaving} subtitle="Scheduled to exit" />
    </div>
  );
}
