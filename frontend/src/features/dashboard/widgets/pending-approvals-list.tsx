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

interface ApprovalItem {
  subjectType: string;
  count: number;
}

interface ApprovalsPayload {
  total: number;
  items: ApprovalItem[];
}

function PendingApprovalsList({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as ApprovalsPayload;
  const typeLabels = dashboardCopy.pendingApprovals.typeLabels as Record<string, string>;

  if (!data.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {dashboardCopy.pendingApprovals.emptyState}
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
            {dashboardCopy.pendingApprovals.totalPrefix}
          </span>
        </div>
        <div className="space-y-2">
          {data.items.map((item) => {
            const label = typeLabels[item.subjectType] ?? item.subjectType;
            return (
              <div
                key={item.subjectType}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{label}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.PENDING_APPROVALS, PendingApprovalsList);
