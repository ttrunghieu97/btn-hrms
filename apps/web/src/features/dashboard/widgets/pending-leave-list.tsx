'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
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

  if (!data?.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
          <Icons.check className="size-4 text-emerald-600" />
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
    <Card className="border-blue-500/20 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs text-primary h-7 gap-1">
          <Link href="/leave">
            Xem tất cả
            <Icons.chevronRight className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.total}</span>
            <span className="text-muted-foreground text-xs">
              {dashboardCopy.pendingLeave.totalPrefix}
            </span>
          </div>
          <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 text-xs">
            Đang chờ duyệt
          </Badge>
        </div>
        <div className="space-y-2">
          {data.items.map((item) => (
            <Link
              key={item.leaveTypeId}
              href="/leave"
              className="flex items-center justify-between rounded-lg border border-border/80 p-2.5 text-xs transition-colors hover:bg-muted/50 hover:border-primary/40"
            >
              <div>
                <div className="font-medium text-foreground">{item.leaveTypeName}</div>
                <div className="text-muted-foreground text-[11px]">
                  {item.totalUnits} {dashboardCopy.pendingLeave.unitDays}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[11px] font-bold">{item.count}</Badge>
                <Icons.chevronRight className="size-3 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.PENDING_LEAVE_REQUESTS, PendingLeaveList);
