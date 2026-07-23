'use client';

import type { ReactNode } from 'react';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { StatusCard } from '@/components/platform';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';

interface TeamLeaveData {
  today: number;
  thisWeek: number;
  nextWeek: number;
}

function TeamLeaveCardFn({ widget }: { widget: DashboardWidgetDto }): ReactNode {
  const data = widget.data as TeamLeaveData | undefined;

  if (!data) {
    return <StatusCard title="Team Leave" value="—" variant="neutral" />;
  }

  return (
    <div className="space-y-3">
      <StatusCard title="On Leave Today" value={data.today} variant="info" />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">This week</p>
          <p className="text-xl font-semibold mt-1">{data.thisWeek}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Next week</p>
          <p className="text-xl font-semibold mt-1">{data.nextWeek}</p>
        </div>
      </div>
    </div>
  );
}

registerWidget(DashboardWidgetId.TEAM_LEAVE, TeamLeaveCardFn);
export const TeamLeaveCard = TeamLeaveCardFn;
