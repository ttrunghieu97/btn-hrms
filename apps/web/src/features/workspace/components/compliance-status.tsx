'use client';

import { StatusCard } from '@/components/platform';

interface ComplianceData {
  documentsExpiring: number;
  contractsEnding: number;
  missingProfiles: number;
}

interface ComplianceStatusProps {
  data?: ComplianceData;
  isLoading?: boolean;
}

export function ComplianceStatus({ data, isLoading }: ComplianceStatusProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Compliance Overview</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard title="Documents Expiring" value="—" variant="neutral" />
          <StatusCard title="Contracts Ending" value="—" variant="neutral" />
          <StatusCard title="Missing Profiles" value="—" variant="neutral" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Compliance Overview</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatusCard
          title="Documents Expiring"
          value={data.documentsExpiring}
          variant={data.documentsExpiring > 10 ? 'warning' : data.documentsExpiring > 0 ? 'info' : 'success'}
          subtitle={data.documentsExpiring > 0 ? 'Within 30 days' : 'All up to date'}
        />
        <StatusCard
          title="Contracts Ending"
          value={data.contractsEnding}
          variant={data.contractsEnding > 5 ? 'warning' : 'info'}
          subtitle="Within 60 days"
        />
        <StatusCard
          title="Missing Profiles"
          value={data.missingProfiles}
          variant={data.missingProfiles > 0 ? 'error' : 'success'}
          subtitle="Incomplete employee records"
        />
      </div>
    </div>
  );
}
