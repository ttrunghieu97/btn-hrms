'use client';

import type { ReactNode } from 'react';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { MetricCard } from '@/components/platform';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';

interface TeamAttendanceData {
  present: number;
  late: number;
  absent: number;
  remote: number;
  total: number;
}

function TeamAttendanceCardFn({ widget }: { widget: DashboardWidgetDto }): ReactNode {
  const data = widget.data as TeamAttendanceData | undefined;

  if (!data) {
    return <MetricCard title="Team Attendance" value="—" subtitle="No data available" />;
  }

  return (
    <div className="space-y-3">
      <MetricCard
        title="Team Attendance Today"
        value={`${data.present}/${data.total}`}
        subtitle={`${(((data.present + data.remote) / data.total) * 100).toFixed(0)}% attendance rate`}
      />
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border p-2 text-center">
          <p className="text-xs text-muted-foreground">Late</p>
          <p className="text-lg font-semibold text-yellow-600">{data.late}</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="text-lg font-semibold text-red-600">{data.absent}</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="text-xs text-muted-foreground">Remote</p>
          <p className="text-lg font-semibold text-blue-600">{data.remote}</p>
        </div>
      </div>
    </div>
  );
}

registerWidget(DashboardWidgetId.TEAM_ATTENDANCE, TeamAttendanceCardFn);
export const TeamAttendanceCard = TeamAttendanceCardFn;
