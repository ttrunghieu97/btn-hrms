'use client';

import { StatusCard } from '@/components/platform';

interface ServiceStatus {
  api: 'up' | 'down';
  database: 'up' | 'down';
  storage: 'up' | 'down';
  queue: 'up' | 'down';
}

interface AdminSystemHealthProps {
  status?: ServiceStatus;
  isLoading?: boolean;
}

const serviceLabels: Record<keyof ServiceStatus, string> = {
  api: 'API',
  database: 'Database',
  storage: 'Storage',
  queue: 'Queue',
};

export function AdminSystemHealth({ status, isLoading }: AdminSystemHealthProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['api', 'database', 'storage', 'queue'] as const).map((svc) => (
          <StatusCard key={svc} title={serviceLabels[svc]} value="—" variant="neutral" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">System Health</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['api', 'database', 'storage', 'queue'] as const).map((svc) => (
          <StatusCard
            key={svc}
            title={serviceLabels[svc]}
            value={status[svc] === 'up' ? 'Operational' : 'Down'}
            variant={status[svc] === 'up' ? 'success' : 'error'}
          />
        ))}
      </div>
    </div>
  );
}
