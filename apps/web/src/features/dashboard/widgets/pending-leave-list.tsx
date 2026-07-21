'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

interface LeaveItem {
  leaveTypeId: string;
  leaveTypeName: string;
  count: number;
  totalUnits: number;
}

interface PendingLeavePayload {
  items: LeaveItem[];
  total: number;
}

function PendingLeaveList({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as PendingLeavePayload;

  if (!data.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {dashboardCopy.pendingLeave.emptyState}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{data.total}</span>
          <span className="text-muted-foreground text-sm">
            {dashboardCopy.pendingLeave.totalPrefix}
          </span>
        </div>
        <div className="space-y-2">
          {data.items.map((item) => (
            <div
              key={item.leaveTypeId}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">{item.leaveTypeName}</div>
                <div className="text-muted-foreground text-xs">
                  {item.totalUnits} {dashboardCopy.pendingLeave.unitDays}
                </div>
              </div>
              <Badge variant="secondary">{item.count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.PENDING_LEAVE_REQUESTS, PendingLeaveList);
