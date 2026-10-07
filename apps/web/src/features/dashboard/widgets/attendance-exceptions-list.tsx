'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

  if (!data.items || data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{data.total}</span>
          <span className="text-muted-foreground text-sm">
            {dashboardCopy.attendanceExceptions.totalPrefix}
          </span>
        </div>
        <div className="space-y-2">
          {data.items.map((item) => {
            const label = labels[item.type] ?? item.type;
            const pct = Math.round((item.count / maxCount) * 100);
            return (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.ATTENDANCE_EXCEPTIONS, AttendanceExceptionsList);
