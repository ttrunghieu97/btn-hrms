'use client';

import type { ReactNode } from 'react';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { StatusCard } from '@/components/platform';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';

interface CompliancePayload {
  documentsExpiring: number;
  contractsEnding: number;
  missingProfiles: number;
}

export function ComplianceStatusCard({ widget }: { widget: DashboardWidgetDto }): ReactNode {
  const data = widget.data as CompliancePayload | undefined;

  if (!data) {
    return <StatusCard title="Compliance" value="—" variant="neutral" />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Compliance Overview</h3>
      <div className="grid grid-cols-1 gap-2">
        <StatusCard
          title="Documents Expiring"
          value={data.documentsExpiring}
          variant={data.documentsExpiring > 10 ? 'warning' : 'info'}
        />
        <StatusCard
          title="Contracts Ending"
          value={data.contractsEnding}
          variant={data.contractsEnding > 5 ? 'warning' : 'info'}
        />
        <StatusCard
          title="Missing Profiles"
          value={data.missingProfiles}
          variant={data.missingProfiles > 0 ? 'error' : 'success'}
        />
      </div>
    </div>
  );
}

registerWidget(DashboardWidgetId.COMPLIANCE_STATUS, ComplianceStatusCard);
