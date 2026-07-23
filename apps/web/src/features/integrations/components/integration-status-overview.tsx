'use client';

import { StatusCard } from '@/components/platform';

interface IntegrationStatusData {
  total: number;
  connected: number;
  error: number;
  disabled: number;
}

interface IntegrationStatusOverviewProps {
  data?: IntegrationStatusData;
  isLoading?: boolean;
}

export function IntegrationStatusOverview({ data, isLoading }: IntegrationStatusOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        <StatusCard title="Total" value="—" variant="neutral" />
        <StatusCard title="Connected" value="—" variant="neutral" />
        <StatusCard title="Errors" value="—" variant="neutral" />
        <StatusCard title="Disabled" value="—" variant="neutral" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <StatusCard title="Total Integrations" value={data.total} variant="info" />
      <StatusCard title="Connected" value={data.connected} variant="success" />
      <StatusCard title="Errors" value={data.error} variant={data.error > 0 ? 'error' : 'success'} />
      <StatusCard title="Disabled" value={data.disabled} variant="neutral" />
    </div>
  );
}
