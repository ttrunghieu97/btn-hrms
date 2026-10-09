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

  if (!data?.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
          <Icons.check className="size-4 text-emerald-600" />
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
    <Card className="border-amber-500/20 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs text-primary h-7 gap-1">
          <Link href="/leave">
            Hộp thư duyệt
            <Icons.chevronRight className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.total}</span>
            <span className="text-muted-foreground text-xs">
              {dashboardCopy.pendingApprovals.totalPrefix}
            </span>
          </div>
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
            Cần hành động
          </Badge>
        </div>
        <div className="space-y-2">
          {data.items.map((item) => {
            const label = typeLabels[item.subjectType] ?? item.subjectType;
            const targetUrl = item.subjectType === 'leave' ? '/leave' : '/administration/approval';
            return (
              <Link
                key={item.subjectType}
                href={targetUrl}
                className="flex items-center justify-between rounded-lg border border-border/80 p-2.5 text-xs transition-colors hover:bg-muted/50 hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <Icons.activity className="size-3.5 text-amber-500" />
                  <span className="font-medium text-foreground">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[11px] font-bold">{item.count}</Badge>
                  <Icons.chevronRight className="size-3 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.PENDING_APPROVALS, PendingApprovalsList);
