'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

interface ExceptionItem {
  type: string;
  count: number;
}

interface ExceptionsPayload {
  total: number;
  items: ExceptionItem[];
}

function AttendanceExceptionsList({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as ExceptionsPayload;
  const labels = dashboardCopy.attendanceExceptions.exceptionLabels as Record<string, string>;

  if (!data?.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
          <Icons.check className="size-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {dashboardCopy.attendanceExceptions.emptyState}
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.items.map((i) => i.count), 1);

  return (
    <Card className="border-rose-500/20 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{widget.title}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs text-primary h-7 gap-1">
          <Link href="/attendance">
            Xử lý ngoại lệ
            <Icons.chevronRight className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{data.total}</span>
            <span className="text-muted-foreground text-xs">
              {dashboardCopy.attendanceExceptions.totalPrefix}
            </span>
          </div>
          <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-500/10 text-xs">
            Cần rà soát
          </Badge>
        </div>
        <div className="space-y-2.5">
          {data.items.map((item) => {
            const label = labels[item.type] ?? item.type;
            const pct = Math.round((item.count / maxCount) * 100);
            return (
              <Link
                key={item.type}
                href="/attendance"
                className="block rounded-md p-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{item.count}</span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.ATTENDANCE_EXCEPTIONS, AttendanceExceptionsList);
