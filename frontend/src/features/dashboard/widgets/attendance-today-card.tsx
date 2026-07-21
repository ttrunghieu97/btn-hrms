'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

interface AttendancePayload {
  totalCheckIns: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onTimeCount: number;
}

const METRICS = [
  {
    key: 'presentCount' as const,
    labelKey: 'presentLabel' as const,
    icon: 'people' as const,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    key: 'absentCount' as const,
    labelKey: 'absentLabel' as const,
    icon: 'employee' as const,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
  {
    key: 'lateCount' as const,
    labelKey: 'lateLabel' as const,
    icon: 'clock' as const,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    key: 'onTimeCount' as const,
    labelKey: 'onTimeLabel' as const,
    icon: 'badgeCheck' as const,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
  },
] as const;

function AttendanceTodayCard({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as AttendancePayload;

  if (!data || data.totalCheckIns === 0 && data.presentCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{dashboardCopy.attendanceToday.emptyState}</p>
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
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{data.totalCheckIns}</span>
          <span className="text-muted-foreground text-sm">
            {dashboardCopy.attendanceToday.checkedInLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {METRICS.map((metric) => {
            const Icon = Icons[metric.icon as keyof typeof Icons];
            return (
              <div
                key={metric.key}
                className={`${metric.bg} flex items-center gap-2 rounded-lg p-3`}
              >
                {Icon && <Icon className={`${metric.color} h-4 w-4`} />}
                <div>
                  <div className={`${metric.color} text-lg font-semibold`}>
                    {data[metric.key]}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {dashboardCopy.attendanceToday[metric.labelKey]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.ATTENDANCE_TODAY, AttendanceTodayCard);
